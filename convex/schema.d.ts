declare const _default: import("convex/server").SchemaDefinition<{
    roles: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId: import("convex/values").GenericId<"users">;
        role: "admin" | "pit" | "viewer";
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        role: import("convex/values").VUnion<"admin" | "pit" | "viewer", [import("convex/values").VLiteral<"admin", "required">, import("convex/values").VLiteral<"pit", "required">, import("convex/values").VLiteral<"viewer", "required">], "required", never>;
    }, "required", "userId" | "role">, {
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    config: import("convex/server").TableDefinition<import("convex/values").VObject<{
        tbaEventKey?: string | undefined;
        tbaTeamKey?: string | undefined;
        pdType: "PDH" | "PDP";
        brownoutThreshold: number;
        nt4Host: string;
        updatedAt: number;
    }, {
        tbaEventKey: import("convex/values").VString<string | undefined, "optional">;
        tbaTeamKey: import("convex/values").VString<string | undefined, "optional">;
        pdType: import("convex/values").VUnion<"PDH" | "PDP", [import("convex/values").VLiteral<"PDH", "required">, import("convex/values").VLiteral<"PDP", "required">], "required", never>;
        brownoutThreshold: import("convex/values").VFloat64<number, "required">;
        nt4Host: import("convex/values").VString<string, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "tbaEventKey" | "tbaTeamKey" | "pdType" | "brownoutThreshold" | "nt4Host" | "updatedAt">, {}, {}, {}>;
    robots: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        pdType: "PDH" | "PDP";
        brownoutThreshold: number;
        nt4Host: string;
        name: string;
    }, {
        name: import("convex/values").VString<string, "required">;
        pdType: import("convex/values").VUnion<"PDH" | "PDP", [import("convex/values").VLiteral<"PDH", "required">, import("convex/values").VLiteral<"PDP", "required">], "required", never>;
        brownoutThreshold: import("convex/values").VFloat64<number, "required">;
        nt4Host: import("convex/values").VString<string, "required">;
        notes: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "pdType" | "brownoutThreshold" | "nt4Host" | "name" | "notes">, {}, {}, {}>;
    events: import("convex/server").TableDefinition<import("convex/values").VObject<{
        tbaEventKey?: string | undefined;
        notes?: string | undefined;
        name: string;
        robotId: import("convex/values").GenericId<"robots">;
        startedAt: number;
    }, {
        name: import("convex/values").VString<string, "required">;
        robotId: import("convex/values").VId<import("convex/values").GenericId<"robots">, "required">;
        tbaEventKey: import("convex/values").VString<string | undefined, "optional">;
        startedAt: import("convex/values").VFloat64<number, "required">;
        notes: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "tbaEventKey" | "name" | "notes" | "robotId" | "startedAt">, {
        by_robot: ["robotId", "_creationTime"];
        by_started: ["startedAt", "_creationTime"];
    }, {}, {}>;
    subsystems: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        robotId?: import("convex/values").GenericId<"robots"> | undefined;
        channel?: number | undefined;
        topicPaths?: string[] | undefined;
        name: string;
        deviceType: string;
        controller: string;
        nominalCurrent: number;
        stallCurrent: number;
        supplyLimit: number;
    }, {
        channel: import("convex/values").VFloat64<number | undefined, "optional">;
        topicPaths: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        name: import("convex/values").VString<string, "required">;
        robotId: import("convex/values").VId<import("convex/values").GenericId<"robots"> | undefined, "optional">;
        deviceType: import("convex/values").VString<string, "required">;
        controller: import("convex/values").VString<string, "required">;
        nominalCurrent: import("convex/values").VFloat64<number, "required">;
        stallCurrent: import("convex/values").VFloat64<number, "required">;
        supplyLimit: import("convex/values").VFloat64<number, "required">;
        notes: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "name" | "notes" | "robotId" | "channel" | "topicPaths" | "deviceType" | "controller" | "nominalCurrent" | "stallCurrent" | "supplyLimit">, {
        by_channel: ["channel", "_creationTime"];
        by_robot: ["robotId", "_creationTime"];
    }, {}, {}>;
    batteries: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        nickname?: string | undefined;
        manufacturer?: string | undefined;
        model?: string | undefined;
        purchasedAt?: number | undefined;
        firstUsedAt?: number | undefined;
        lastRestingVoltage?: number | undefined;
        lastInternalResistance?: number | undefined;
        healthScore?: number | undefined;
        label: string;
        cycleCount: number;
        status: "rotation" | "reserved" | "charging" | "retired";
    }, {
        label: import("convex/values").VString<string, "required">;
        nickname: import("convex/values").VString<string | undefined, "optional">;
        manufacturer: import("convex/values").VString<string | undefined, "optional">;
        model: import("convex/values").VString<string | undefined, "optional">;
        purchasedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        firstUsedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        cycleCount: import("convex/values").VFloat64<number, "required">;
        status: import("convex/values").VUnion<"rotation" | "reserved" | "charging" | "retired", [import("convex/values").VLiteral<"rotation", "required">, import("convex/values").VLiteral<"reserved", "required">, import("convex/values").VLiteral<"charging", "required">, import("convex/values").VLiteral<"retired", "required">], "required", never>;
        lastRestingVoltage: import("convex/values").VFloat64<number | undefined, "optional">;
        lastInternalResistance: import("convex/values").VFloat64<number | undefined, "optional">;
        healthScore: import("convex/values").VFloat64<number | undefined, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "notes" | "label" | "nickname" | "manufacturer" | "model" | "purchasedAt" | "firstUsedAt" | "cycleCount" | "status" | "lastRestingVoltage" | "lastInternalResistance" | "healthScore">, {
        by_label: ["label", "_creationTime"];
    }, {}, {}>;
    batteryMeasurements: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        cca?: number | undefined;
        enteredByUserId?: import("convex/values").GenericId<"users"> | undefined;
        batteryId: import("convex/values").GenericId<"batteries">;
        measuredAt: number;
        restingVoltage: number;
        internalResistance: number;
    }, {
        batteryId: import("convex/values").VId<import("convex/values").GenericId<"batteries">, "required">;
        measuredAt: import("convex/values").VFloat64<number, "required">;
        restingVoltage: import("convex/values").VFloat64<number, "required">;
        internalResistance: import("convex/values").VFloat64<number, "required">;
        cca: import("convex/values").VFloat64<number | undefined, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        enteredByUserId: import("convex/values").VId<import("convex/values").GenericId<"users"> | undefined, "optional">;
    }, "required", "notes" | "batteryId" | "measuredAt" | "restingVoltage" | "internalResistance" | "cca" | "enteredByUserId">, {
        by_battery: ["batteryId", "_creationTime"];
    }, {}, {}>;
    matches: import("convex/server").TableDefinition<import("convex/values").VObject<{
        setNumber?: number | undefined;
        scheduledTime?: number | undefined;
        actualTime?: number | undefined;
        alliance?: string | undefined;
        tbaMatchKey: string;
        eventKey: string;
        matchNumber: number;
        compLevel: string;
    }, {
        tbaMatchKey: import("convex/values").VString<string, "required">;
        eventKey: import("convex/values").VString<string, "required">;
        matchNumber: import("convex/values").VFloat64<number, "required">;
        setNumber: import("convex/values").VFloat64<number | undefined, "optional">;
        compLevel: import("convex/values").VString<string, "required">;
        scheduledTime: import("convex/values").VFloat64<number | undefined, "optional">;
        actualTime: import("convex/values").VFloat64<number | undefined, "optional">;
        alliance: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "tbaMatchKey" | "eventKey" | "matchNumber" | "setNumber" | "compLevel" | "scheduledTime" | "actualTime" | "alliance">, {
        by_event: ["eventKey", "_creationTime"];
        by_match_key: ["tbaMatchKey", "_creationTime"];
    }, {}, {}>;
    sessions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        batteryId?: import("convex/values").GenericId<"batteries"> | undefined;
        endedAt?: number | undefined;
        matchId?: import("convex/values").GenericId<"matches"> | undefined;
        eventId?: import("convex/values").GenericId<"events"> | undefined;
        peakTotalCurrent?: number | undefined;
        avgVoltage?: number | undefined;
        energyJoules?: number | undefined;
        brownoutCount?: number | undefined;
        importProgress?: number | undefined;
        importDone?: boolean | undefined;
        startedAt: number;
        label: string;
        source: "live" | "dslog" | "wpilog";
        sampleRateHz: number;
        channels: number[];
    }, {
        label: import("convex/values").VString<string, "required">;
        source: import("convex/values").VUnion<"live" | "dslog" | "wpilog", [import("convex/values").VLiteral<"live", "required">, import("convex/values").VLiteral<"dslog", "required">, import("convex/values").VLiteral<"wpilog", "required">], "required", never>;
        startedAt: import("convex/values").VFloat64<number, "required">;
        endedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        matchId: import("convex/values").VId<import("convex/values").GenericId<"matches"> | undefined, "optional">;
        batteryId: import("convex/values").VId<import("convex/values").GenericId<"batteries"> | undefined, "optional">;
        eventId: import("convex/values").VId<import("convex/values").GenericId<"events"> | undefined, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        peakTotalCurrent: import("convex/values").VFloat64<number | undefined, "optional">;
        avgVoltage: import("convex/values").VFloat64<number | undefined, "optional">;
        energyJoules: import("convex/values").VFloat64<number | undefined, "optional">;
        brownoutCount: import("convex/values").VFloat64<number | undefined, "optional">;
        sampleRateHz: import("convex/values").VFloat64<number, "required">;
        channels: import("convex/values").VArray<number[], import("convex/values").VFloat64<number, "required">, "required">;
        importProgress: import("convex/values").VFloat64<number | undefined, "optional">;
        importDone: import("convex/values").VBoolean<boolean | undefined, "optional">;
    }, "required", "notes" | "startedAt" | "label" | "batteryId" | "source" | "endedAt" | "matchId" | "eventId" | "peakTotalCurrent" | "avgVoltage" | "energyJoules" | "brownoutCount" | "sampleRateHz" | "channels" | "importProgress" | "importDone">, {
        by_started: ["startedAt", "_creationTime"];
        by_match: ["matchId", "_creationTime"];
        by_battery: ["batteryId", "_creationTime"];
        by_event: ["eventId", "_creationTime"];
    }, {}, {}>;
    sampleWindows: import("convex/server").TableDefinition<import("convex/values").VObject<{
        sessionId: import("convex/values").GenericId<"sessions">;
        windowIndex: number;
        startMs: number;
        samples: {
            topics?: Record<string, number> | undefined;
            can?: number | undefined;
            mode?: string | undefined;
            t: number;
            v: number;
            c: number[];
        }[];
    }, {
        sessionId: import("convex/values").VId<import("convex/values").GenericId<"sessions">, "required">;
        windowIndex: import("convex/values").VFloat64<number, "required">;
        startMs: import("convex/values").VFloat64<number, "required">;
        samples: import("convex/values").VArray<{
            topics?: Record<string, number> | undefined;
            can?: number | undefined;
            mode?: string | undefined;
            t: number;
            v: number;
            c: number[];
        }[], import("convex/values").VObject<{
            topics?: Record<string, number> | undefined;
            can?: number | undefined;
            mode?: string | undefined;
            t: number;
            v: number;
            c: number[];
        }, {
            t: import("convex/values").VFloat64<number, "required">;
            v: import("convex/values").VFloat64<number, "required">;
            c: import("convex/values").VArray<number[], import("convex/values").VFloat64<number, "required">, "required">;
            topics: import("convex/values").VRecord<Record<string, number> | undefined, import("convex/values").VString<string, "required">, import("convex/values").VFloat64<number, "required">, "optional", string>;
            can: import("convex/values").VFloat64<number | undefined, "optional">;
            mode: import("convex/values").VString<string | undefined, "optional">;
        }, "required", "t" | "v" | "c" | "topics" | "can" | "mode" | `topics.${string}`>, "required">;
    }, "required", "sessionId" | "windowIndex" | "startMs" | "samples">, {
        by_session_window: ["sessionId", "windowIndex", "_creationTime"];
        by_session: ["sessionId", "_creationTime"];
    }, {}, {}>;
    liveBuffers: import("convex/server").TableDefinition<import("convex/values").VObject<{
        mode?: string | undefined;
        canUtil?: number | undefined;
        matchTime?: number | undefined;
        sessionId: import("convex/values").GenericId<"sessions">;
        capturedAt: number;
        voltage: number;
        totalCurrent: number;
        channelCurrents: number[];
    }, {
        sessionId: import("convex/values").VId<import("convex/values").GenericId<"sessions">, "required">;
        capturedAt: import("convex/values").VFloat64<number, "required">;
        voltage: import("convex/values").VFloat64<number, "required">;
        totalCurrent: import("convex/values").VFloat64<number, "required">;
        channelCurrents: import("convex/values").VArray<number[], import("convex/values").VFloat64<number, "required">, "required">;
        canUtil: import("convex/values").VFloat64<number | undefined, "optional">;
        mode: import("convex/values").VString<string | undefined, "optional">;
        matchTime: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "sessionId" | "mode" | "capturedAt" | "voltage" | "totalCurrent" | "channelCurrents" | "canUtil" | "matchTime">, {
        by_session_time: ["sessionId", "capturedAt", "_creationTime"];
    }, {}, {}>;
    captureLocks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users"> | undefined;
        sessionId: import("convex/values").GenericId<"sessions">;
        key: string;
        deviceId: string;
        deviceLabel: string;
        heartbeatAt: number;
    }, {
        key: import("convex/values").VString<string, "required">;
        sessionId: import("convex/values").VId<import("convex/values").GenericId<"sessions">, "required">;
        deviceId: import("convex/values").VString<string, "required">;
        deviceLabel: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users"> | undefined, "optional">;
        heartbeatAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "sessionId" | "key" | "deviceId" | "deviceLabel" | "heartbeatAt">, {
        by_key: ["key", "_creationTime"];
    }, {}, {}>;
    alerts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        batteryId?: import("convex/values").GenericId<"batteries"> | undefined;
        matchId?: import("convex/values").GenericId<"matches"> | undefined;
        sessionId?: import("convex/values").GenericId<"sessions"> | undefined;
        subsystemId?: import("convex/values").GenericId<"subsystems"> | undefined;
        dedupeKey?: string | undefined;
        resolvedAt?: number | undefined;
        resolvedReason?: string | undefined;
        resolvedByUserId?: import("convex/values").GenericId<"users"> | undefined;
        severity: "info" | "warning" | "critical";
        message: string;
        occurredAt: number;
        kind: string;
    }, {
        severity: import("convex/values").VUnion<"info" | "warning" | "critical", [import("convex/values").VLiteral<"info", "required">, import("convex/values").VLiteral<"warning", "required">, import("convex/values").VLiteral<"critical", "required">], "required", never>;
        kind: import("convex/values").VString<string, "required">;
        message: import("convex/values").VString<string, "required">;
        sessionId: import("convex/values").VId<import("convex/values").GenericId<"sessions"> | undefined, "optional">;
        batteryId: import("convex/values").VId<import("convex/values").GenericId<"batteries"> | undefined, "optional">;
        subsystemId: import("convex/values").VId<import("convex/values").GenericId<"subsystems"> | undefined, "optional">;
        matchId: import("convex/values").VId<import("convex/values").GenericId<"matches"> | undefined, "optional">;
        occurredAt: import("convex/values").VFloat64<number, "required">;
        dedupeKey: import("convex/values").VString<string | undefined, "optional">;
        resolvedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        resolvedReason: import("convex/values").VString<string | undefined, "optional">;
        resolvedByUserId: import("convex/values").VId<import("convex/values").GenericId<"users"> | undefined, "optional">;
    }, "required", "batteryId" | "matchId" | "sessionId" | "severity" | "message" | "subsystemId" | "occurredAt" | "dedupeKey" | "resolvedAt" | "resolvedReason" | "resolvedByUserId" | "kind">, {
        by_occurred: ["occurredAt", "_creationTime"];
        by_session: ["sessionId", "_creationTime"];
        by_battery: ["batteryId", "_creationTime"];
        by_dedupe: ["dedupeKey", "_creationTime"];
    }, {}, {}>;
    users: import("convex/server").TableDefinition<import("convex/values").VObject<{
        name?: string | undefined;
        email?: string | undefined;
        phone?: string | undefined;
        image?: string | undefined;
        emailVerificationTime?: number | undefined;
        phoneVerificationTime?: number | undefined;
        isAnonymous?: boolean | undefined;
    }, {
        name: import("convex/values").VString<string | undefined, "optional">;
        image: import("convex/values").VString<string | undefined, "optional">;
        email: import("convex/values").VString<string | undefined, "optional">;
        emailVerificationTime: import("convex/values").VFloat64<number | undefined, "optional">;
        phone: import("convex/values").VString<string | undefined, "optional">;
        phoneVerificationTime: import("convex/values").VFloat64<number | undefined, "optional">;
        isAnonymous: import("convex/values").VBoolean<boolean | undefined, "optional">;
    }, "required", "name" | "email" | "phone" | "image" | "emailVerificationTime" | "phoneVerificationTime" | "isAnonymous">, {
        email: ["email", "_creationTime"];
        phone: ["phone", "_creationTime"];
    }, {}, {}>;
    authSessions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId: import("convex/values").GenericId<"users">;
        expirationTime: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        expirationTime: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "expirationTime">, {
        userId: ["userId", "_creationTime"];
    }, {}, {}>;
    authAccounts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        secret?: string | undefined;
        emailVerified?: string | undefined;
        phoneVerified?: string | undefined;
        userId: import("convex/values").GenericId<"users">;
        provider: string;
        providerAccountId: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        provider: import("convex/values").VString<string, "required">;
        providerAccountId: import("convex/values").VString<string, "required">;
        secret: import("convex/values").VString<string | undefined, "optional">;
        emailVerified: import("convex/values").VString<string | undefined, "optional">;
        phoneVerified: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "secret" | "userId" | "provider" | "providerAccountId" | "emailVerified" | "phoneVerified">, {
        userIdAndProvider: ["userId", "provider", "_creationTime"];
        providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
    }, {}, {}>;
    authRefreshTokens: import("convex/server").TableDefinition<import("convex/values").VObject<{
        firstUsedTime?: number | undefined;
        parentRefreshTokenId?: import("convex/values").GenericId<"authRefreshTokens"> | undefined;
        expirationTime: number;
        sessionId: import("convex/values").GenericId<"authSessions">;
    }, {
        sessionId: import("convex/values").VId<import("convex/values").GenericId<"authSessions">, "required">;
        expirationTime: import("convex/values").VFloat64<number, "required">;
        firstUsedTime: import("convex/values").VFloat64<number | undefined, "optional">;
        parentRefreshTokenId: import("convex/values").VId<import("convex/values").GenericId<"authRefreshTokens"> | undefined, "optional">;
    }, "required", "expirationTime" | "sessionId" | "firstUsedTime" | "parentRefreshTokenId">, {
        sessionId: ["sessionId", "_creationTime"];
        sessionIdAndParentRefreshTokenId: ["sessionId", "parentRefreshTokenId", "_creationTime"];
    }, {}, {}>;
    authVerificationCodes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        emailVerified?: string | undefined;
        phoneVerified?: string | undefined;
        verifier?: string | undefined;
        expirationTime: number;
        provider: string;
        accountId: import("convex/values").GenericId<"authAccounts">;
        code: string;
    }, {
        accountId: import("convex/values").VId<import("convex/values").GenericId<"authAccounts">, "required">;
        provider: import("convex/values").VString<string, "required">;
        code: import("convex/values").VString<string, "required">;
        expirationTime: import("convex/values").VFloat64<number, "required">;
        verifier: import("convex/values").VString<string | undefined, "optional">;
        emailVerified: import("convex/values").VString<string | undefined, "optional">;
        phoneVerified: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "expirationTime" | "provider" | "emailVerified" | "phoneVerified" | "accountId" | "code" | "verifier">, {
        accountId: ["accountId", "_creationTime"];
        code: ["code", "_creationTime"];
    }, {}, {}>;
    authVerifiers: import("convex/server").TableDefinition<import("convex/values").VObject<{
        sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
        signature?: string | undefined;
    }, {
        sessionId: import("convex/values").VId<import("convex/values").GenericId<"authSessions"> | undefined, "optional">;
        signature: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "sessionId" | "signature">, {
        signature: ["signature", "_creationTime"];
    }, {}, {}>;
    authRateLimits: import("convex/server").TableDefinition<import("convex/values").VObject<{
        identifier: string;
        lastAttemptTime: number;
        attemptsLeft: number;
    }, {
        identifier: import("convex/values").VString<string, "required">;
        lastAttemptTime: import("convex/values").VFloat64<number, "required">;
        attemptsLeft: import("convex/values").VFloat64<number, "required">;
    }, "required", "identifier" | "lastAttemptTime" | "attemptsLeft">, {
        identifier: ["identifier", "_creationTime"];
    }, {}, {}>;
}, true>;
export default _default;
