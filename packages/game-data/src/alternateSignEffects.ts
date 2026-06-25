/**
 * Rulebook §114 p.115 — Alternate witcher sign effects.
 */

import { clampSignStaSpent } from "./magicResolution";
import { axiiStunSaveModifier } from "./signEffects";

function sta(staSpent: number): number {
  return clampSignStaSpent(Math.max(0, staSpent));
}

export function magicTrapDamage(opts?: { prepared?: boolean }): string | null {
  if (opts?.prepared === false) return null;
  return "3d6";
}

export function activeShieldHpPerSta(staSpent: number): number {
  return sta(staSpent) * 10;
}

export function activeShieldMaintenanceSta(initialSta: number): number {
  return Math.ceil(sta(initialSta) / 2);
}

export function fireStreamIgniteChancePercent(): number {
  return 75;
}

export function fireStreamMaintenanceSta(initialSta: number): number {
  return Math.floor(Math.max(0, initialSta) / 2);
}

export function puppetStunSavePenaltyPerTwoSta(staSpent: number): number {
  return axiiStunSaveModifier(staSpent);
}
