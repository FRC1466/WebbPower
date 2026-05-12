// FRC competition order: qualifications, then playoffs in bracket order.
const COMP_LEVEL_ORDER: Record<string, number> = {
  qm: 0,  // qualifications
  ef: 1,  // eighth-finals
  qf: 2,  // quarterfinals
  sf: 3,  // semifinals
  f: 4,   // finals
};

export type SortableMatch = {
  compLevel: string;
  matchNumber: number;
  setNumber?: number;
};

export function compareMatches(a: SortableMatch, b: SortableMatch) {
  const ao = COMP_LEVEL_ORDER[a.compLevel] ?? 99;
  const bo = COMP_LEVEL_ORDER[b.compLevel] ?? 99;
  if (ao !== bo) return ao - bo;
  // Playoffs: order by set first (the bracket position),
  // then by match within the set (best-of for finals).
  if (a.compLevel !== "qm") {
    const aSet = a.setNumber ?? 0;
    const bSet = b.setNumber ?? 0;
    if (aSet !== bSet) return aSet - bSet;
  }
  return (a.matchNumber ?? 0) - (b.matchNumber ?? 0);
}

export function matchLabel(m: SortableMatch & { tbaMatchKey?: string }) {
  const level = m.compLevel;

  // Qualifications: Q 42
  if (level === "qm") {
    return `Q ${m.matchNumber}`;
  }

  // Finals: F 1-1, F 1-2, F 1-3
  if (level === "f") {
    const set = m.setNumber ?? 1;
    return `F ${set}-${m.matchNumber}`;
  }

  // Eighth-finals (pre-2023): E 1-1
  if (level === "ef") {
    return `E ${m.setNumber ?? 1}-${m.matchNumber}`;
  }

  // Quarterfinals (pre-2023): QF 1-1
  if (level === "qf") {
    return `QF ${m.setNumber ?? 1}-${m.matchNumber}`;
  }

  // Semifinals (pre-2023 3-SF format): SF 1-1
  // In 2023+ double-elimination, ALL playoff matches use comp_level "sf"
  // with set_number 1–13 identifying bracket position. Map to named rounds.
  if (level === "sf") {
    const set = m.setNumber ?? 1;
    // 8-team double-elim bracket (standard FRC 2023+):
    //   Upper R1: 1-4  | Lower R1: 5-8  | Upper R2/Lower R2: 9-12  | Finals: 13
    // If set > 4 it's clearly double-elim, so use round labels.
    if (set >= 13) return `SF Finals-${m.matchNumber}`;
    if (set >= 9)  return `SF R3 ${set}-${m.matchNumber}`;
    if (set >= 5)  return `SF R2 ${set}-${m.matchNumber}`;
    if (set >= 1 && set <= 4) {
      // Could be old-style 2-SF (sets 1-2) or double-elim R1 (sets 1-4).
      // Use generic "SF" for sets 1-2 to stay compatible with old events.
      if (set <= 2) return `SF ${set}-${m.matchNumber}`;
      return `SF R1 ${set}-${m.matchNumber}`;
    }
    return `SF ${set}-${m.matchNumber}`;
  }

  // Fallback
  return `${level.toUpperCase()} ${m.setNumber ?? 1}-${m.matchNumber}`;
}
