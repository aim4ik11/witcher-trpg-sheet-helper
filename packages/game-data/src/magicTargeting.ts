/**
 * Rulebook §168 — Magic targeting (direct / AoE / self-affecting).
 */

export type MagicTargetingMode = "direct" | "aoe" | "self";

export interface MagicTargetingInput {
  range?: string;
  effect?: string;
  defense?: string;
  category?: string;
}

export interface MagicTargetingResolution {
  mode: MagicTargetingMode;
  requiresOpposedDefense: boolean;
  areaDefenseVsCastRoll: boolean;
}

function rangeText(input: MagicTargetingInput): string {
  return (input.range ?? "").toLowerCase();
}

export function classifyMagicTargeting(input: MagicTargetingInput): MagicTargetingMode {
  const range = rangeText(input);
  if (/\bself\b/.test(range)) return "self";
  if (/cone|radius|diameter|\baoe\b|area/.test(range)) return "aoe";
  return "direct";
}

export function resolveMagicTargeting(input: MagicTargetingInput): MagicTargetingResolution {
  const mode = classifyMagicTargeting(input);
  if (mode === "self") {
    return { mode, requiresOpposedDefense: false, areaDefenseVsCastRoll: false };
  }
  if (mode === "aoe") {
    return { mode, requiresOpposedDefense: false, areaDefenseVsCastRoll: true };
  }
  return { mode, requiresOpposedDefense: true, areaDefenseVsCastRoll: false };
}

export function selfAffectingCastSuccess(castTotal: number, castingDc: number): boolean {
  return castTotal > castingDc;
}

export function aoeTargetResists(
  casterCastTotal: number,
  targetDefenseTotal: number,
): boolean {
  return targetDefenseTotal > casterCastTotal;
}
