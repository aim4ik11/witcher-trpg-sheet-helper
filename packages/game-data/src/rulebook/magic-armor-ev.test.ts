/**
 * Rulebook: `curated/magic.md` — armor EV penalizes Spell Casting
 */
import { describe, expect, it } from "vitest";
import type { Character } from "@wilmak/shared";
import {
  magicCastModifierFromArmor,
  spellCastingModifierFromArmorEv,
  totalEquippedArmorEv,
} from "../magicArmorPenalty";

function characterWithArmor(evPieces: number[]): Character {
  return {
    id: "c1",
    name: "Armored Mage",
    type: "player",
    occupation: "Mage",
    armor: evPieces.map((ev, i) => ({
      id: `a${i}`,
      slot: "torso",
      name: `Piece ${i}`,
      sp: 10,
      ev,
      damage: 0,
      effects: "",
      weight: 0,
    })),
  } as unknown as Character;
}

describe("rulebook magic — armor EV penalizes Spell Casting", () => {
  it("totalEquippedArmorEv sums EV from worn armor", () => {
    expect(totalEquippedArmorEv(characterWithArmor([2, 1]))).toBe(3);
    expect(totalEquippedArmorEv(characterWithArmor([]))).toBe(0);
  });

  it("each EV point applies -1 to Spell Casting checks", () => {
    expect(spellCastingModifierFromArmorEv(0)).toBe(0);
    expect(spellCastingModifierFromArmorEv(2)).toBe(-2);
    expect(spellCastingModifierFromArmorEv(5)).toBe(-5);
  });

  it("magicCastModifierFromArmor applies total EV penalty to cast roll", () => {
    const c = characterWithArmor([2, 1]);
    expect(magicCastModifierFromArmor(c)).toBe(-3);
  });
});
