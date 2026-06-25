/**
 * Rulebook §114 — Witcher sign mechanical effects.
 */

import { clampSignStaSpent } from "./magicResolution";

export interface SignEffectInput {
  signName: string;
  staSpent: number;
  spellCastingRoll?: number;
}

function clampSta(staSpent: number): number {
  return clampSignStaSpent(Math.max(0, staSpent));
}

/** Yrden: SPD/REF penalty equals STA spent (negative modifier). */
export function yrdenSpdRefPenalty(staSpent: number): number {
  return -clampSta(staSpent);
}

/** Quen: blocks one failed dodge/block per STA spent. */
export function quenBlocksPerSta(staSpent: number): number {
  return clampSta(staSpent);
}

/** Aard: 10% prone per STA spent. */
export function aardProneChancePercent(staSpent: number): number {
  return clampSta(staSpent) * 10;
}

/** Igni: 1d6 per STA spent. */
export function igniDamageDice(staSpent: number): string {
  const n = clampSta(staSpent);
  return n <= 0 ? "0" : `${n}d6`;
}

/** Igni: 50% ignite chance (rulebook fixed). */
export function igniIgniteChancePercent(): number {
  return 50;
}

/** Axii: stun save at -1; +1 harder per 2 STA past 1. */
export function axiiStunSaveModifier(staSpent: number): number {
  const sta = clampSta(staSpent);
  if (sta <= 0) return 0;
  return -(1 + Math.floor((sta - 1) / 2));
}

export function axiiUsesSpellCastingNotPersuasion(): boolean {
  return true;
}
