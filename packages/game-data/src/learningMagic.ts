/**
 * Rulebook §123 — Learning spells, invocations, rituals, hexes, signs.
 */

import { getMagicSections } from "./gameOptions";

export type MagicLearningTier =
  | "novice"
  | "journeyman"
  | "master"
  | "arch_priest";

export interface MagicLearningRequirements {
  ipRequired: number;
  baseDays: number;
  learningDc: number;
  learningChecksRequired: number;
}

const TIER_TABLE: Record<MagicLearningTier, MagicLearningRequirements> = {
  novice: { ipRequired: 10, baseDays: 4, learningDc: 14, learningChecksRequired: 2 },
  journeyman: { ipRequired: 20, baseDays: 7, learningDc: 18, learningChecksRequired: 4 },
  master: { ipRequired: 30, baseDays: 21, learningDc: 22, learningChecksRequired: 6 },
  arch_priest: { ipRequired: 40, baseDays: 35, learningDc: 24, learningChecksRequired: 8 },
};

const PROFESSION_MAGIC: Record<string, Set<string>> = {
  Mage: new Set(["spell", "ritual", "hex", "sign"]),
  Priest: new Set(["invocation", "ritual", "hex", "sign"]),
  Witcher: new Set(["sign"]),
};

export function magicLearningRequirements(tier: MagicLearningTier): MagicLearningRequirements {
  return { ...TIER_TABLE[tier] };
}

export function canLearnMagic(vigor: number): boolean {
  return vigor > 0;
}

export function learningTimeAfterFailures(baseDays: number, failedChecks: number): number {
  return baseDays + Math.max(0, failedChecks);
}

export function professionCanLearnMagicType(
  occupation: string,
  magicType: "spell" | "invocation" | "sign" | "ritual" | "hex",
): boolean {
  const allowed = PROFESSION_MAGIC[occupation];
  if (allowed) return allowed.has(magicType);
  return getMagicSections(occupation).some((s) => s.key === magicType);
}
