import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Per-user role assignment.
  roles: defineTable({
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("pit"),
      v.literal("viewer"),
    ),
  }).index("by_user", ["userId"]),

  // Global config (one document).
  config: defineTable({
    tbaEventKey: v.optional(v.string()),
    tbaTeamKey: v.optional(v.string()),
    pdType: v.union(v.literal("PDH"), v.literal("PDP")),
    brownoutThreshold: v.number(),
    nt4Host: v.string(),
    updatedAt: v.number(),
  }),

  // Robots — one entry per physical robot chassis configuration.
  robots: defineTable({
    name: v.string(),
    pdType: v.union(v.literal("PDH"), v.literal("PDP")),
    brownoutThreshold: v.number(),
    nt4Host: v.string(),
    notes: v.optional(v.string()),
  }),

  // Competition events a robot attends.
  events: defineTable({
    name: v.string(),
    robotId: v.id("robots"),
    tbaEventKey: v.optional(v.string()),
    startedAt: v.number(),
    notes: v.optional(v.string()),
  }).index("by_robot", ["robotId"])
    .index("by_started", ["startedAt"]),

  // PDH/PDP channel OR log-topic mapping to a named subsystem.
  // A subsystem is identified by `name`. It can be sourced two ways:
  //   - channel-based: `channel` is the PDH/PDP channel number
  //   - topic-based: `topicPaths` is a list of wpilog/NT4 topic paths whose
  //     numeric values are summed to produce the subsystem's current
  // Topic-based is preferred when PDH is not on CAN.
  subsystems: defineTable({
    channel: v.optional(v.number()),
    topicPaths: v.optional(v.array(v.string())),
    name: v.string(),
    robotId: v.optional(v.id("robots")),
    deviceType: v.string(),
    controller: v.string(),
    nominalCurrent: v.number(),
    stallCurrent: v.number(),
    supplyLimit: v.number(),
    notes: v.optional(v.string()),
  }).index("by_channel", ["channel"])
    .index("by_robot", ["robotId"]),

  // Robot batteries.
  batteries: defineTable({
    label: v.string(),
    nickname: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    model: v.optional(v.string()),
    purchasedAt: v.optional(v.number()),
    firstUsedAt: v.optional(v.number()),
    cycleCount: v.number(),
    status: v.union(
      v.literal("rotation"),
      v.literal("reserved"),
      v.literal("charging"),
      v.literal("retired"),
    ),
    lastRestingVoltage: v.optional(v.number()),
    lastInternalResistance: v.optional(v.number()),
    healthScore: v.optional(v.number()),
    notes: v.optional(v.string()),
  }).index("by_label", ["label"]),

  // Battery Beak / manual readings.
  batteryMeasurements: defineTable({
    batteryId: v.id("batteries"),
    measuredAt: v.number(),
    restingVoltage: v.number(),
    internalResistance: v.number(),
    cca: v.optional(v.number()),
    notes: v.optional(v.string()),
    enteredByUserId: v.optional(v.id("users")),
  }).index("by_battery", ["batteryId"]),

  // TBA-imported match metadata.
  matches: defineTable({
    tbaMatchKey: v.string(),
    eventKey: v.string(),
    matchNumber: v.number(),
    setNumber: v.optional(v.number()),
    compLevel: v.string(),
    scheduledTime: v.optional(v.number()),
    actualTime: v.optional(v.number()),
    alliance: v.optional(v.string()),
  }).index("by_event", ["eventKey"])
    .index("by_match_key", ["tbaMatchKey"]),

  // A captured/imported telemetry session.
  sessions: defineTable({
    label: v.string(),
    source: v.union(
      v.literal("live"),
      v.literal("dslog"),
      v.literal("wpilog"),
    ),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    matchId: v.optional(v.id("matches")),
    batteryId: v.optional(v.id("batteries")),
    eventId: v.optional(v.id("events")),
    notes: v.optional(v.string()),
    peakTotalCurrent: v.optional(v.number()),
    avgVoltage: v.optional(v.number()),
    energyJoules: v.optional(v.number()),
    brownoutCount: v.optional(v.number()),
    sampleRateHz: v.number(),
    channels: v.array(v.number()),
    importProgress: v.optional(v.number()),
    importDone: v.optional(v.boolean()),
  })
    .index("by_started", ["startedAt"])
    .index("by_match", ["matchId"])
    .index("by_battery", ["batteryId"])
    .index("by_event", ["eventId"]),

  // 1-second sample windows.
  // c[]: per-PDH-channel currents (legacy / when PDH is on CAN)
  // topics: per-topic-path currents (when subsystems are topic-based)
  sampleWindows: defineTable({
    sessionId: v.id("sessions"),
    windowIndex: v.number(),
    startMs: v.number(),
    samples: v.array(
      v.object({
        t: v.number(),
        v: v.number(),
        c: v.array(v.number()),
        topics: v.optional(v.record(v.string(), v.number())),
        can: v.optional(v.number()),
        mode: v.optional(v.string()),
      }),
    ),
  })
    .index("by_session_window", ["sessionId", "windowIndex"])
    .index("by_session", ["sessionId"]),

  // Latest 30s rolling buffer for viewers (live capture only).
  liveBuffers: defineTable({
    sessionId: v.id("sessions"),
    capturedAt: v.number(),
    voltage: v.number(),
    totalCurrent: v.number(),
    channelCurrents: v.array(v.number()),
    canUtil: v.optional(v.number()),
    mode: v.optional(v.string()),
    matchTime: v.optional(v.number()),
  }).index("by_session_time", ["sessionId", "capturedAt"]),

  // Single capture lock per robot (we use a fixed key "robot").
  captureLocks: defineTable({
    key: v.string(),
    sessionId: v.id("sessions"),
    deviceId: v.string(),
    deviceLabel: v.string(),
    userId: v.optional(v.id("users")),
    heartbeatAt: v.number(),
  }).index("by_key", ["key"]),

  // Alerts emitted from live capture and post-import analysis.
  alerts: defineTable({
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("critical"),
    ),
    kind: v.string(),
    message: v.string(),
    sessionId: v.optional(v.id("sessions")),
    batteryId: v.optional(v.id("batteries")),
    subsystemId: v.optional(v.id("subsystems")),
    matchId: v.optional(v.id("matches")),
    occurredAt: v.number(),
    dedupeKey: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    resolvedReason: v.optional(v.string()),
    resolvedByUserId: v.optional(v.id("users")),
  })
    .index("by_occurred", ["occurredAt"])
    .index("by_session", ["sessionId"])
    .index("by_battery", ["batteryId"])
    .index("by_dedupe", ["dedupeKey"]),
});
