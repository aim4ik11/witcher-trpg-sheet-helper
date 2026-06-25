/**
 * Rulebook curated/magic.md — Armor EV penalizes Spell Casting.
 */

import type { Character } from "@wilmak/shared";

export function armorPieceEv(piece: { ev?: number }): number {
  return piece.ev ?? 0;
}

export function totalEquippedArmorEv(character: Character): number {
  return (character.armor ?? []).reduce((sum, piece) => sum + armorPieceEv(piece), 0);
}

export function spellCastingModifierFromArmorEv(ev: number): number {
  if (ev <= 0) return 0;
  return -ev;
}

export function magicCastModifierFromArmor(character: Character): number {
  return spellCastingModifierFromArmorEv(totalEquippedArmorEv(character));
}
