/**
 * Rulebook §166 — Mixed fumble: GM picks one elemental rider at random.
 */

import type { MagicElement } from "./magicResolution";

const ELEMENTAL_RIDERS: Exclude<MagicElement, "mixed">[] = [
  "earth",
  "air",
  "fire",
  "water",
];

export function pickMixedFumbleElementalRider(
  rng: () => number = Math.random,
): Exclude<MagicElement, "mixed"> {
  const roll = rng();
  if (roll < 0.25) return "earth";
  if (roll < 0.5) return "air";
  if (roll < 0.75) return "fire";
  return "water";
}

export function mixedFumbleRiderPool(): readonly Exclude<MagicElement, "mixed">[] {
  return ELEMENTAL_RIDERS;
}
