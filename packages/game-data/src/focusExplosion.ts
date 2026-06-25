/**
 * Rulebook §166 — Catastrophic fumble: focus explodes (1d10, 2 m radius).
 */

import { rollDie } from "./dice";

export interface FocusExplosionResult {
  damage: number;
  radiusMeters: number;
  focusDestroyed: boolean;
}

const EXPLOSION_RADIUS_M = 2;

export function resolveFocusExplosion(dieRoll?: number): FocusExplosionResult {
  const damage = dieRoll ?? rollDie(10);
  return {
    damage,
    radiusMeters: EXPLOSION_RADIUS_M,
    focusDestroyed: true,
  };
}

export function focusExplosionDamageToTarget(
  explosionDamage: number,
  distanceMeters: number,
): number {
  return distanceMeters <= EXPLOSION_RADIUS_M ? explosionDamage : 0;
}
