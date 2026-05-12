import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const TBA_BASE = "https://www.thebluealliance.com/api/v3";

type TbaMatch = {
  key: string;
  comp_level: string;
  match_number: number;
  set_number?: number;
  event_key: string;
  time?: number | null;
  predicted_time?: number | null;
  actual_time?: number | null;
  alliances: {
    red: { team_keys: string[] };
    blue: { team_keys: string[] };
  };
};

export const importEvent = action({
  args: {
    eventKey: v.string(),
    teamKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.TBA_API_KEY;
    if (!apiKey) throw new Error("TBA_API_KEY env var not set in Convex");
    const res = await fetch(`${TBA_BASE}/event/${args.eventKey}/matches`, {
      headers: { "X-TBA-Auth-Key": apiKey },
    });
    if (!res.ok) {
      throw new Error(`TBA fetch failed: ${res.status} ${res.statusText}`);
    }
    const matches = (await res.json()) as TbaMatch[];
    let imported = 0;
    for (const m of matches) {
      const teamAlliance = args.teamKey
        ? m.alliances.red.team_keys.includes(args.teamKey)
          ? "red"
          : m.alliances.blue.team_keys.includes(args.teamKey)
            ? "blue"
            : undefined
        : undefined;
      const scheduledTime = m.predicted_time ?? m.time ?? undefined;
      const actualTime = m.actual_time ?? undefined;
      await ctx.runMutation(api.matches.upsertMatch, {
        tbaMatchKey: m.key,
        eventKey: m.event_key,
        matchNumber: m.match_number,
        setNumber: m.set_number,
        compLevel: m.comp_level,
        scheduledTime: scheduledTime ? scheduledTime * 1000 : undefined,
        actualTime: actualTime ? actualTime * 1000 : undefined,
        alliance: teamAlliance,
      });
      imported++;
    }
    return { imported };
  },
});
