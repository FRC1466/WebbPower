"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// AI skill: summarize a session into a human-readable diagnostic note.
// Wires up Anthropic if ANTHROPIC_API_KEY is set, otherwise returns a
// deterministic summary computed from session stats.
export const summarizeSession = action({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(api.sessions.get, { id: args.sessionId });
    if (!data?.session) throw new Error("Session not found");
    const s = data.session;
    const facts: string[] = [];
    facts.push(`Source: ${s.source}.`);
    if (s.peakTotalCurrent != null)
      facts.push(`Peak total current: ${s.peakTotalCurrent.toFixed(1)} A.`);
    if (s.avgVoltage != null)
      facts.push(`Average bus voltage: ${s.avgVoltage.toFixed(2)} V.`);
    if (s.brownoutCount != null)
      facts.push(`Brownout events: ${s.brownoutCount}.`);
    if (s.energyJoules != null)
      facts.push(`Energy delivered: ${(s.energyJoules / 1000).toFixed(1)} kJ.`);
    if (data.battery) facts.push(`Battery used: ${data.battery.label}.`);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return facts.join(" ");
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: `You are an FRC power diagnostic assistant. Summarize this match in 3-5 sentences, calling out any red flags:\n\n${facts.join(" ")}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      return facts.join(" ");
    }
    const body = (await res.json()) as {
      content?: Array<{ text?: string }>;
    };
    return body.content?.[0]?.text ?? facts.join(" ");
  },
});
