import { Nt4Client, type Nt4Sample } from "./nt4-client";
import { useLiveStore, type LiveSample } from "@/store/live";
import type { ConvexReactClient } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const NUM_CHANNELS = 24;
const DOWNSAMPLE_HZ = 10;
const WINDOW_SECONDS = 1;
const DOWNSAMPLE_INTERVAL_MS = 1000 / DOWNSAMPLE_HZ;
const WINDOW_INTERVAL_MS = WINDOW_SECONDS * 1000;

type State = {
  voltage: number;
  totalCurrent: number;
  channelCurrents: number[];
  canUtil: number;
  mode: string;
  matchTime: number | undefined;
  // DS state booleans for mode derivation
  dsEnabled: boolean;
  dsAuto: boolean;
  dsTest: boolean;
};

function parseChannelTopic(topicName: string): number | null {
  // Common patterns:
  // /PowerDistribution/Chan{N}_Current
  // /SmartDashboard/Power/Ch{N}
  // /AdvantageKit/RealOutputs/PowerDistribution/Chan{N}
  const m = topicName.match(/(?:Ch(?:an)?)(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

export function startCapture(opts: {
  host: string;
  sessionId: Id<"sessions">;
  convex: ConvexReactClient;
  deviceId: string;
  brownoutThreshold: number;
}) {
  const { host, sessionId, convex, deviceId, brownoutThreshold } = opts;
  const state: State = {
    voltage: 12,
    totalCurrent: 0,
    channelCurrents: new Array(NUM_CHANNELS).fill(0),
    canUtil: 0,
    mode: "Disabled",
    matchTime: undefined,
    dsEnabled: false,
    dsAuto: false,
    dsTest: false,
  };

  function deriveMode() {
    if (!state.dsEnabled) return "Disabled";
    if (state.dsTest) return "Test";
    if (state.dsAuto) return "Auto";
    return "Teleop";
  }

  const client = new Nt4Client(host);
  let downsampled: LiveSample[] = [];
  let windowStart = Date.now();
  let windowIndex = 0;
  let lastBrownoutAt = 0;

  const offConn = client.onConnected((c) => {
    useLiveStore.getState().setConnected(c);
  });

  const offSamples = client.on((s: Nt4Sample) => {
    handleSample(s);
  });

  client.connect();
  useLiveStore.getState().setIsCapturing(true);

  function handleSample(s: Nt4Sample) {
    const name = s.topic;
    const value = s.value;
    if (typeof value === "number") {
      const chan = parseChannelTopic(name);
      if (chan !== null && /current/i.test(name)) {
        if (chan < NUM_CHANNELS) state.channelCurrents[chan] = value;
        return;
      }
      if (/voltage/i.test(name)) {
        state.voltage = value;
        if (value < brownoutThreshold && Date.now() - lastBrownoutAt > 1000) {
          lastBrownoutAt = Date.now();
          convex
            .mutation(api.alerts.emit, {
              severity: "critical",
              kind: "brownout",
              message: `Brownout: ${value.toFixed(2)}V`,
              sessionId,
              dedupeKey: `brownout:${sessionId}:${Math.floor(Date.now() / 5000)}`,
            })
            .catch(() => {});
        } else if (
          value < 7.0 &&
          Date.now() - lastBrownoutAt > 1000
        ) {
          lastBrownoutAt = Date.now();
          convex
            .mutation(api.alerts.emit, {
              severity: "warning",
              kind: "near_brownout",
              message: `Near brownout: ${value.toFixed(2)}V`,
              sessionId,
              dedupeKey: `near_brownout:${sessionId}:${Math.floor(Date.now() / 5000)}`,
            })
            .catch(() => {});
        }
        return;
      }
      if (/total.*current/i.test(name)) {
        state.totalCurrent = value;
        return;
      }
      if (/(canUtilization|CAN.*Util)/i.test(name)) {
        state.canUtil = value;
        if (value > 80) {
          convex
            .mutation(api.alerts.emit, {
              severity: "warning",
              kind: "can_high",
              message: `CAN utilization ${value.toFixed(0)}%`,
              sessionId,
              dedupeKey: `can_high:${sessionId}:${Math.floor(Date.now() / 5000)}`,
            })
            .catch(() => {});
        }
        return;
      }
      if (/MatchTime|FMSInfo.*MatchTime/i.test(name)) {
        state.matchTime = value;
        return;
      }
    }
    // DS boolean mode topics — WPILib publishes these via NT4 under /FMSInfo/ and /DriverStation/
    if (typeof value === "boolean") {
      if (/\/(FMSInfo|DriverStation)\/Is?Autonomous$/i.test(name)) {
        state.dsAuto = value;
        state.mode = deriveMode();
        return;
      }
      if (/\/(FMSInfo|DriverStation)\/Is?Enabled$/i.test(name)) {
        state.dsEnabled = value;
        state.mode = deriveMode();
        return;
      }
      if (/\/(FMSInfo|DriverStation)\/Is?Test$/i.test(name)) {
        state.dsTest = value;
        state.mode = deriveMode();
        return;
      }
      if (/\/(FMSInfo|DriverStation)\/Is?Teleop$/i.test(name) && value) {
        state.dsAuto = false;
        state.dsTest = false;
        state.mode = deriveMode();
        return;
      }
    }
    // Fallback: some teams publish a string mode topic
    if (typeof value === "string" && /\/mode$/i.test(name)) {
      state.mode = value;
    }
  }

  // 10Hz downsample: snapshot the state into the local Zustand store only.
  // Convex writes happen on the 1-second window boundary below.
  const downsampleTimer = window.setInterval(() => {
    state.totalCurrent = state.channelCurrents.reduce((a, b) => a + b, 0);
    const sample: LiveSample = {
      capturedAt: Date.now(),
      voltage: state.voltage,
      totalCurrent: state.totalCurrent,
      channelCurrents: [...state.channelCurrents],
      canUtil: state.canUtil,
      mode: state.mode,
      matchTime: state.matchTime,
    };
    useLiveStore.getState().pushSample(sample);
    downsampled.push(sample);
  }, DOWNSAMPLE_INTERVAL_MS);

  // Every 1s flush the window into Convex sampleWindows AND write a single
  // live buffer entry so other viewers see ~1Hz updates.
  const windowTimer = window.setInterval(() => {
    if (downsampled.length === 0) return;
    const samples = downsampled.map((d) => ({
      t: d.capturedAt - windowStart,
      v: d.voltage,
      c: d.channelCurrents,
      can: d.canUtil,
      mode: d.mode,
    }));
    convex
      .mutation(api.sessions.appendSampleWindow, {
        sessionId,
        windowIndex,
        startMs: windowStart,
        samples,
      })
      .catch(() => {});
    const last = downsampled[downsampled.length - 1];
    convex
      .mutation(api.sessions.appendLive, {
        sessionId,
        capturedAt: last.capturedAt,
        voltage: last.voltage,
        totalCurrent: last.totalCurrent,
        channelCurrents: last.channelCurrents,
        canUtil: last.canUtil,
        mode: last.mode,
        matchTime: last.matchTime,
      })
      .catch(() => {});
    windowIndex++;
    windowStart = Date.now();
    downsampled = [];
  }, WINDOW_INTERVAL_MS);

  // Heartbeat capture lock.
  const heartbeatTimer = window.setInterval(() => {
    convex.mutation(api.capture.heartbeat, { deviceId }).catch(() => {});
  }, 5000);

  return {
    stop() {
      offConn();
      offSamples();
      client.close();
      window.clearInterval(downsampleTimer);
      window.clearInterval(windowTimer);
      window.clearInterval(heartbeatTimer);
      useLiveStore.getState().reset();
      convex
        .mutation(api.capture.release, { deviceId })
        .catch(() => {});
    },
  };
}
