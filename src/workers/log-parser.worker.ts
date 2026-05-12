/// <reference lib="webworker" />

// Parsers for FRC Driver Station and WPILib data logs.
//
// Refs:
// - .dslog: https://github.com/wpilibsuite/allwpilib/blob/main/wpilibj/src/main/java/edu/wpi/first/wpilibj/datalog/DataLog.java
// - .wpilog: https://github.com/wpilibsuite/allwpilib/blob/main/wpiutil/doc/datalog.adoc
// - AdvantageKit publishes through wpilog and uses /PowerDistribution/ChannelCurrent (double[]) for per-channel currents.

type WireMessage =
  | { type: "parse-dslog"; buf: ArrayBuffer; fileName: string }
  | { type: "parse-wpilog"; buf: ArrayBuffer; fileName: string; wantedTopics?: string[] }
  | {
      type: "describe-wpilog";
      buf: ArrayBuffer;
      // Optional list of topic paths to also compute min/max/mean from.
      sampleTopics?: string[];
    };

type ParsedSample = {
  t: number;
  v: number;
  c: number[];
  can?: number;
  mode?: string;
  topics?: Record<string, number>;
};

type ParsedMeta = {
  eventName?: string;
  matchNumber?: number;
  matchType?: number; // TBA mapping below
  replayNumber?: number;
  brownoutThreshold?: number;
};

type ParseResult = {
  samples: ParsedSample[];
  startedAt: number;
  endedAt: number;
  channels: number[];
  source: "dslog" | "wpilog";
  meta: ParsedMeta;
};

function postProgress(progress: number) {
  postMessage({ type: "progress", progress });
}

function parseDslog(buf: ArrayBuffer): ParseResult {
  const view = new DataView(buf);
  let pos = 0;
  if (buf.byteLength < 10) {
    return {
      samples: [],
      startedAt: Date.now(),
      endedAt: Date.now(),
      channels: [],
      source: "dslog",
      meta: {},
    };
  }
  const version = view.getUint16(pos);
  pos += 2;
  pos += 2;
  const startMs = Number(view.getBigInt64(pos));
  pos += 8;

  const samples: ParsedSample[] = [];
  const recordSize = version >= 3 ? 20 : 8;
  const total = Math.floor((buf.byteLength - pos) / recordSize);
  for (let i = 0; i < total; i++) {
    const samplePeriod = view.getUint8(pos);
    const tripTime = view.getUint8(pos + 1);
    const battH = view.getUint8(pos + 2);
    const battL = view.getUint8(pos + 3);
    const voltage = battH + battL / 256.0;
    let bandwidth: number | undefined;
    let currents: number[] = [];
    if (recordSize >= 20) {
      bandwidth = view.getUint8(pos + 4);
      currents = new Array(16);
      for (let c = 0; c < 16; c++) {
        const byte = view.getUint8(pos + 5 + Math.floor(c / 2));
        const nibble = c % 2 === 0 ? (byte >> 4) & 0x0f : byte & 0x0f;
        currents[c] = nibble * 8;
      }
    }
    pos += recordSize;
    const t = i * (samplePeriod || 20);
    samples.push({
      t,
      v: voltage,
      c: currents,
      can: bandwidth,
      mode: tripTime > 0 ? "teleop" : "disabled",
    });
    if ((i & 0xff) === 0) postProgress(i / total);
  }
  postProgress(1);
  return {
    samples,
    startedAt: startMs,
    endedAt: startMs + samples.length * 20,
    channels: Array.from({ length: 16 }, (_, k) => k),
    source: "dslog",
    meta: {},
  };
}

type EntryInfo = { name: string; type: string };

function parseWpilog(buf: ArrayBuffer, wantedTopics?: string[]): ParseResult {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let pos = 0;
  if (buf.byteLength < 12) {
    return {
      samples: [],
      startedAt: Date.now(),
      endedAt: Date.now(),
      channels: [],
      source: "wpilog",
      meta: {},
    };
  }
  const magic = String.fromCharCode(...bytes.subarray(0, 6));
  if (magic !== "WPILOG") {
    throw new Error("Not a WPILOG file");
  }
  pos = 6;
  pos += 2; // version (uint16 LE)
  const metaLen = view.getUint32(pos, true);
  pos += 4;
  pos += metaLen;

  const entries = new Map<number, EntryInfo>();
  const meta: ParsedMeta = {};
  const fileStartedAt = Date.now();

  // Pre-allocated time-series storage.
  const voltageT: number[] = [];
  const voltageV: number[] = [];
  const totalCurrentT: number[] = [];
  const totalCurrentV: number[] = [];
  const canT: number[] = [];
  const canV: number[] = [];
  // Per-timestamp channel-currents (double[] payload).
  const channelT: number[] = [];
  const channelV: number[][] = [];

  const wantedSet = new Set(wantedTopics ?? []);
  const extraTopicT = new Map<string, number[]>();
  const extraTopicV = new Map<string, number[]>();

  // DS state samples — we coalesce by timestamp.
  type DsRow = { ts: number; auto?: boolean; en?: boolean; test?: boolean };
  const dsRows = new Map<number, DsRow>();
  function dsRow(ts: number): DsRow {
    let r = dsRows.get(ts);
    if (!r) {
      r = { ts };
      dsRows.set(ts, r);
    }
    return r;
  }

  const fileBytes = buf.byteLength;
  while (pos < fileBytes - 1) {
    const headerByte = view.getUint8(pos);
    pos += 1;
    const idLen = (headerByte & 0x3) + 1;
    const payloadSizeLen = ((headerByte >> 2) & 0x3) + 1;
    const timestampLen = ((headerByte >> 4) & 0x7) + 1;
    if (pos + idLen + payloadSizeLen + timestampLen > fileBytes) break;
    let entryId = 0;
    for (let i = 0; i < idLen; i++) entryId |= bytes[pos + i] << (i * 8);
    pos += idLen;
    let payloadSize = 0;
    for (let i = 0; i < payloadSizeLen; i++)
      payloadSize |= bytes[pos + i] << (i * 8);
    pos += payloadSizeLen;
    let timestamp = 0;
    for (let i = 0; i < timestampLen; i++)
      timestamp += bytes[pos + i] * 2 ** (i * 8);
    pos += timestampLen;
    if (pos + payloadSize > fileBytes) break;
    const payloadStart = pos;
    pos += payloadSize;

    if (entryId === 0) {
      // Control record.
      if (payloadSize >= 1 && bytes[payloadStart] === 0) {
        // Start record: ctrlByte(0), id(u32), nameLen(u32), name, typeLen(u32), type, metaLen(u32), meta
        let p = payloadStart + 1;
        const id =
          bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16) | (bytes[p + 3] << 24);
        p += 4;
        const nameLen =
          bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16) | (bytes[p + 3] << 24);
        p += 4;
        const name = new TextDecoder().decode(bytes.subarray(p, p + nameLen));
        p += nameLen;
        const typeLen =
          bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16) | (bytes[p + 3] << 24);
        p += 4;
        const type = new TextDecoder().decode(bytes.subarray(p, p + typeLen));
        entries.set(id, { name, type });
      }
    } else {
      const entry = entries.get(entryId);
      if (!entry) continue;
      const name = entry.name;
      const type = entry.type;
      const ts = timestamp; // microseconds in wpilog
      switch (name) {
        case "/PowerDistribution/Voltage":
        case "/SystemStats/BatteryVoltage":
          if (type === "double" && payloadSize >= 8) {
            voltageT.push(ts);
            voltageV.push(view.getFloat64(payloadStart, true));
          }
          break;
        case "/PowerDistribution/TotalCurrent":
          if (type === "double" && payloadSize >= 8) {
            totalCurrentT.push(ts);
            totalCurrentV.push(view.getFloat64(payloadStart, true));
          }
          break;
        case "/PowerDistribution/ChannelCurrent":
          if (type === "double[]" && payloadSize >= 8) {
            const count = payloadSize / 8;
            const arr = new Array<number>(count);
            for (let i = 0; i < count; i++)
              arr[i] = view.getFloat64(payloadStart + i * 8, true);
            channelT.push(ts);
            channelV.push(arr);
          }
          break;
        case "/SystemStats/CANBus/Utilization":
          if (type === "float" && payloadSize >= 4) {
            canT.push(ts);
            canV.push(view.getFloat32(payloadStart, true));
          } else if (type === "double" && payloadSize >= 8) {
            canT.push(ts);
            canV.push(view.getFloat64(payloadStart, true));
          }
          break;
        case "/SystemStats/BrownoutVoltage":
          if (type === "double" && payloadSize >= 8) {
            meta.brownoutThreshold = view.getFloat64(payloadStart, true);
          }
          break;
        case "/DriverStation/MatchNumber":
          if (type === "int64" && payloadSize >= 8) {
            meta.matchNumber = Number(
              view.getBigInt64(payloadStart, true),
            );
          }
          break;
        case "/DriverStation/MatchType":
          if (type === "int64" && payloadSize >= 8) {
            meta.matchType = Number(view.getBigInt64(payloadStart, true));
          }
          break;
        case "/DriverStation/ReplayNumber":
          if (type === "int64" && payloadSize >= 8) {
            meta.replayNumber = Number(
              view.getBigInt64(payloadStart, true),
            );
          }
          break;
        case "/DriverStation/EventName":
          if (type === "string") {
            meta.eventName = new TextDecoder().decode(
              bytes.subarray(payloadStart, payloadStart + payloadSize),
            );
          }
          break;
        case "/DriverStation/Autonomous":
          if (type === "boolean" && payloadSize >= 1) {
            dsRow(ts).auto = bytes[payloadStart] !== 0;
          }
          break;
        case "/DriverStation/Enabled":
          if (type === "boolean" && payloadSize >= 1) {
            dsRow(ts).en = bytes[payloadStart] !== 0;
          }
          break;
        case "/DriverStation/Test":
          if (type === "boolean" && payloadSize >= 1) {
            dsRow(ts).test = bytes[payloadStart] !== 0;
          }
          break;
        default:
          if (wantedSet.has(name)) {
            if (type === "double" && payloadSize >= 8) {
              if (!extraTopicT.has(name)) { extraTopicT.set(name, []); extraTopicV.set(name, []); }
              extraTopicT.get(name)!.push(ts);
              extraTopicV.get(name)!.push(view.getFloat64(payloadStart, true));
            } else if (type === "float" && payloadSize >= 4) {
              if (!extraTopicT.has(name)) { extraTopicT.set(name, []); extraTopicV.set(name, []); }
              extraTopicT.get(name)!.push(ts);
              extraTopicV.get(name)!.push(view.getFloat32(payloadStart, true));
            } else if (type === "int64" && payloadSize >= 8) {
              if (!extraTopicT.has(name)) { extraTopicT.set(name, []); extraTopicV.set(name, []); }
              extraTopicT.get(name)!.push(ts);
              extraTopicV.get(name)!.push(Number(view.getBigInt64(payloadStart, true)));
            }
          }
          break;
      }
    }
    if ((pos & 0x3ffff) === 0) postProgress(pos / fileBytes);
  }

  postProgress(0.98);

  // Bucket every series into 100ms buckets aligned at 0, then merge.
  const bucketMs = 100;
  function bucketKey(usec: number) {
    return Math.floor(usec / 1000 / bucketMs) * bucketMs;
  }
  type Sample = ParsedSample;
  const samplesByT = new Map<number, Sample>();
  function get(t: number, channelCount: number): Sample {
    let s = samplesByT.get(t);
    if (!s) {
      s = { t, v: 0, c: new Array(channelCount).fill(0) };
      samplesByT.set(t, s);
    }
    if (s.c.length < channelCount) {
      while (s.c.length < channelCount) s.c.push(0);
    }
    return s;
  }
  const channelCount =
    channelV.length > 0 ? channelV[channelV.length - 1].length : 0;

  for (let i = 0; i < voltageT.length; i++) {
    const t = bucketKey(voltageT[i]);
    get(t, channelCount).v = voltageV[i];
  }
  for (let i = 0; i < channelT.length; i++) {
    const t = bucketKey(channelT[i]);
    const s = get(t, channelV[i].length);
    s.c = channelV[i];
  }
  for (let i = 0; i < canT.length; i++) {
    const t = bucketKey(canT[i]);
    get(t, channelCount).can = canV[i];
  }

  for (const [topic, times] of extraTopicT.entries()) {
    const vals = extraTopicV.get(topic)!;
    for (let i = 0; i < times.length; i++) {
      const t = bucketKey(times[i]);
      const s = get(t, channelCount);
      if (!s.topics) s.topics = {};
      s.topics[topic] = vals[i];
    }
  }

  // Robot mode: latest-wins per bucket.
  const dsSorted = [...dsRows.values()].sort((a, b) => a.ts - b.ts);
  let curAuto = false;
  let curEn = false;
  let curTest = false;
  for (const r of dsSorted) {
    if (r.auto !== undefined) curAuto = r.auto;
    if (r.en !== undefined) curEn = r.en;
    if (r.test !== undefined) curTest = r.test;
    const t = bucketKey(r.ts);
    const s = get(t, channelCount);
    s.mode = curTest
      ? curEn
        ? "test"
        : "disabled"
      : curAuto
        ? curEn
          ? "auto"
          : "disabled"
        : curEn
          ? "teleop"
          : "disabled";
  }

  const samples = [...samplesByT.values()].sort((a, b) => a.t - b.t);
  const channels = Array.from({ length: channelCount }, (_, i) => i);
  const endedAt = fileStartedAt + (samples.at(-1)?.t ?? 0);

  postProgress(1);
  return {
    samples,
    startedAt: fileStartedAt,
    endedAt,
    channels,
    source: "wpilog",
    meta,
  };
}

// ---- describe-wpilog: fast pass that only catalogs entries and computes
// per-topic statistics (min/max/mean) for numeric types. Used by the
// subsystem-import UI so the user can pick topics without a full parse.
function describeWpilog(
  buf: ArrayBuffer,
  sampleTopics?: string[],
): {
  entries: { name: string; type: string; sampleCount: number }[];
  stats: Record<string, { min: number; max: number; mean: number; count: number }>;
} {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let pos = 0;
  const magic = String.fromCharCode(...bytes.subarray(0, 6));
  if (magic !== "WPILOG") throw new Error("Not a WPILOG file");
  pos = 6;
  pos += 2;
  const metaLen = view.getUint32(pos, true);
  pos += 4 + metaLen;

  type E = { name: string; type: string; sampleCount: number };
  const entryMap = new Map<number, E>();
  const statsMap = new Map<string, { min: number; max: number; sum: number; count: number }>();
  const wantAll = !sampleTopics?.length;
  const wantSet = new Set(sampleTopics ?? []);

  while (pos < buf.byteLength - 1) {
    const headerByte = view.getUint8(pos++);
    const idLen = (headerByte & 0x3) + 1;
    const payloadSizeLen = ((headerByte >> 2) & 0x3) + 1;
    const timestampLen = ((headerByte >> 4) & 0x7) + 1;
    if (pos + idLen + payloadSizeLen + timestampLen > buf.byteLength) break;
    let entryId = 0;
    for (let i = 0; i < idLen; i++) entryId |= bytes[pos + i] << (i * 8);
    pos += idLen;
    let payloadSize = 0;
    for (let i = 0; i < payloadSizeLen; i++) payloadSize |= bytes[pos + i] << (i * 8);
    pos += payloadSizeLen;
    pos += timestampLen;
    if (pos + payloadSize > buf.byteLength) break;
    const payloadStart = pos;
    pos += payloadSize;

    if (entryId === 0 && payloadSize >= 1 && bytes[payloadStart] === 0) {
      let p = payloadStart + 1;
      const id = view.getInt32(p, true); p += 4;
      const nameLen = view.getInt32(p, true); p += 4;
      const name = new TextDecoder().decode(bytes.subarray(p, p + nameLen)); p += nameLen;
      const typeLen = view.getInt32(p, true); p += 4;
      const type = new TextDecoder().decode(bytes.subarray(p, p + typeLen));
      entryMap.set(id, { name, type, sampleCount: 0 });
    } else {
      const e = entryMap.get(entryId);
      if (!e) continue;
      e.sampleCount++;
      if (
        (e.type === "double" || e.type === "float" || e.type === "int64") &&
        (wantAll || wantSet.has(e.name))
      ) {
        let v: number | null = null;
        if (e.type === "double" && payloadSize >= 8) v = view.getFloat64(payloadStart, true);
        else if (e.type === "float" && payloadSize >= 4) v = view.getFloat32(payloadStart, true);
        else if (e.type === "int64" && payloadSize >= 8) v = Number(view.getBigInt64(payloadStart, true));
        if (v !== null) {
          let st = statsMap.get(e.name);
          if (!st) { st = { min: v, max: v, sum: 0, count: 0 }; statsMap.set(e.name, st); }
          if (v < st.min) st.min = v;
          if (v > st.max) st.max = v;
          st.sum += v;
          st.count++;
        }
      }
    }
  }

  const stats: Record<string, { min: number; max: number; mean: number; count: number }> = {};
  for (const [k, v] of statsMap) {
    stats[k] = { min: v.min, max: v.max, mean: v.sum / v.count, count: v.count };
  }
  return {
    entries: [...entryMap.values()].filter(
      (e) => e.type === "double" || e.type === "float" || e.type === "int64" || e.type === "double[]",
    ),
    stats,
  };
}

self.onmessage = (e: MessageEvent<WireMessage>) => {
  const msg = e.data;
  try {
    if (msg.type === "describe-wpilog") {
      const result = describeWpilog(msg.buf, msg.sampleTopics);
      postMessage({ type: "described", result });
      return;
    }
    let result: ParseResult;
    if (msg.type === "parse-dslog") {
      result = parseDslog(msg.buf);
    } else {
      result = parseWpilog(msg.buf, msg.wantedTopics);
    }
    postMessage({ type: "done", result });
  } catch (err) {
    postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

export {};
