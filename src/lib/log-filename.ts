// Detect FRC competition + match info from a log filename.
// Examples:
//   akit_26-03-20_20-19-42_tnkn_q41.wpilog -> { compLevel: "qm", matchNumber: 41, eventCode: "tnkn" }
//   akit_26-03-20_20-19-42_tnkn_q41_sim.wpilog -> isSim true
//   FRC_20260320_201942_TNKN_Q41.dslog -> matched too (case-insensitive)
//   ..._sf5.wpilog -> { compLevel: "sf", setNumber: 5 }
//   ..._qf3m2.wpilog -> { compLevel: "qf", setNumber: 3, matchNumber: 2 }
//   ..._f2.wpilog -> { compLevel: "f", matchNumber: 2 }

export type FilenameMatchInfo = {
  compLevel?: "qm" | "qf" | "sf" | "f" | "ef" | "practice";
  matchNumber?: number;
  setNumber?: number;
  eventCode?: string;
  isSim?: boolean;
};

export function detectFromFilename(name: string): FilenameMatchInfo {
  const lower = name.toLowerCase();
  const result: FilenameMatchInfo = {};
  if (/_sim\.(wpilog|dslog|dsevents)/.test(lower)) result.isSim = true;
  if (/practice|_p\d+/.test(lower)) result.compLevel = "practice";

  // Match comp-level tokens between underscores, looking from the end.
  // Common tokens: q41, qm41, qf3m1, sf5, sf5m2, f1, f3
  const tokens = lower.replace(/\.(wpilog|dslog|dsevents)$/, "").split(/[_-]/);
  for (const tok of tokens) {
    let m;
    if ((m = tok.match(/^(?:qm|q)(\d+)$/))) {
      result.compLevel = "qm";
      result.matchNumber = Number(m[1]);
      continue;
    }
    if ((m = tok.match(/^qf(\d+)(?:m(\d+))?$/))) {
      result.compLevel = "qf";
      result.setNumber = Number(m[1]);
      result.matchNumber = m[2] ? Number(m[2]) : 1;
      continue;
    }
    if ((m = tok.match(/^sf(\d+)(?:m(\d+))?$/))) {
      result.compLevel = "sf";
      result.setNumber = Number(m[1]);
      result.matchNumber = m[2] ? Number(m[2]) : 1;
      continue;
    }
    if ((m = tok.match(/^f(\d+)$/))) {
      result.compLevel = "f";
      result.setNumber = 1;
      result.matchNumber = Number(m[1]);
      continue;
    }
  }

  // Event code: 3-5 alphanumeric token after a date or before the comp token.
  // Heuristic: take the second-to-last token if it's 3-6 chars alphanumeric.
  const reversed = [...tokens].reverse();
  for (let i = 0; i < reversed.length; i++) {
    const t = reversed[i];
    if (
      i > 0 &&
      /^[a-z0-9]{3,8}$/.test(t) &&
      !/^(akit|wpilog|dslog|sim|frc)$/.test(t) &&
      !/^\d+$/.test(t)
    ) {
      result.eventCode = t;
      break;
    }
  }
  return result;
}

// Map WPILib MatchType int64 -> our compLevel.
export function matchTypeToCompLevel(
  matchType?: number,
): "qm" | "f" | "practice" | undefined {
  switch (matchType) {
    case 1:
      return "practice";
    case 2:
      return "qm";
    case 3:
      return "f"; // elimination — we can't tell qf/sf/f from this alone
    default:
      return undefined;
  }
}
