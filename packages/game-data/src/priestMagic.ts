/**
 * Rulebook §166 — Overdrawn priests use mixed elemental results.
 */

import { fumbleElementForCaster, type MagicElement } from "./magicResolution";

export function priestFumbleElement(spellElement: MagicElement): MagicElement {
  return fumbleElementForCaster(spellElement, "Priest");
}

export function priestOverexertionBacklashElement(
  spellElement: MagicElement,
  occupation: string,
): MagicElement {
  const occ = occupation.trim().toLowerCase();
  if (occ === "priest") return "mixed";
  return spellElement;
}

export function requiresDimeritiumEnduranceCheck(touchingDimeritium: boolean): boolean {
  return touchingDimeritium;
}

export const DIMERITIUM_ENDURANCE_DC = 16;
export const DIMERITIUM_CHECK_INTERVAL_MINUTES = 30;
