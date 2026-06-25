/**
 * Rulebook §166 p.168, §120 — Hex weaving (fail = nothing; fumble = 50% self).
 */

import type { EvaluatedSkillCheck } from "./skillCheck";

export interface HexCastInput {
  hexWeavingCheck: EvaluatedSkillCheck;
  dc?: number;
  fumbleSecondRoll?: number;
  rng?: () => number;
}

export interface HexCastResult {
  hexApplied: boolean;
  targetAffected: boolean;
  casterAffected: boolean;
  backfire: boolean;
  componentsLost: boolean;
}

export function resolveHexCast(input: HexCastInput): HexCastResult {
  const { hexWeavingCheck: check } = input;
  const dc = input.dc;

  if (check.outcome === "fumble") {
    const rng = input.rng ?? Math.random;
    const backfire = rng() < 0.5;
    return {
      hexApplied: false,
      targetAffected: false,
      casterAffected: backfire,
      backfire,
      componentsLost: false,
    };
  }

  const success = dc == null ? check.success !== false : check.success === true;
  if (!success) {
    return {
      hexApplied: false,
      targetAffected: false,
      casterAffected: false,
      backfire: false,
      componentsLost: false,
    };
  }

  return {
    hexApplied: true,
    targetAffected: true,
    casterAffected: false,
    backfire: false,
    componentsLost: false,
  };
}
