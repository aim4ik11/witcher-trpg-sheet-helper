/**
 * Rulebook: `sections/166-magic-resolution.md` — magicCast.ts integration gaps (TDD)
 */
import { describe, expect, it } from "vitest";
import type { Character, Spell } from "@wilmak/shared";
import { resolveMagicCast } from "../magicCast";

function mage(overrides: Partial<Character> = {}): Character {
  return {
    id: "m1",
    name: "Yennefer",
    type: "player",
    occupation: "Mage",
    attributes: { will: 10 },
    skills: { spellCasting: 9 },
    vitals: { hp: { current: 40, max: 40 }, sta: { current: 30, max: 30 } },
    armor: [{ id: "a1", slot: "torso", name: "Robes", sp: 5, ev: 2 }],
    ...overrides,
  } as Character;
}

const bolt: Spell = {
  id: "s1",
  category: "spell",
  name: "Brand of Fire",
  staCost: 5,
  range: "10m",
  duration: "instant",
  effect: "Burn",
  element: "fire",
};

describe("rulebook §166 — magicCast integration (TDD)", () => {
  it("applies armor EV penalty to Spell Casting roll modifier", () => {
    const result = resolveMagicCast({
      character: mage(),
      spell: bolt,
      dieRolls: [5],
      armorEvPenalty: true,
    });
    expect(result.armorEvModifier).toBe(-2);
  });

  it("priest overexertion flags mixed elemental backlash", () => {
    const priest = mage({ occupation: "Priest" });
    const result = resolveMagicCast({
      character: priest,
      spell: { ...bolt, staCost: 8 },
      dieRolls: [6],
    });
    expect(result.overexertionElement).toBe("mixed");
  });

  it("catastrophic fumble resolves focus explosion damage for bystanders", () => {
    const result = resolveMagicCast({
      character: mage(),
      spell: bolt,
      dieRolls: [1],
      fumbleSecondRoll: 10,
      focusExplosionRoll: 8,
    });
    expect(result.fumble?.focusExplodes).toBe(true);
    expect(result.focusExplosionDamage).toBe(8);
    expect(result.focusExplosionRadiusMeters).toBe(2);
  });

  it("mixed fumble resolves random elemental rider when second roll 7–9", () => {
    const result = resolveMagicCast({
      character: mage(),
      spell: { ...bolt, element: "mixed" },
      dieRolls: [1],
      fumbleSecondRoll: 8,
      mixedFumbleRiderRoll: () => 0.6,
    });
    expect(result.fumble?.resolvedRider).toBe("fire");
    expect(result.fumble?.onFire).toBe(true);
  });

  it("stunned from STA triggers stun-save recovery loop flag", () => {
    const result = resolveMagicCast({
      character: mage({
        vitals: {
          hp: { current: 40, max: 40 },
          sta: { current: 2, max: 30 },
          woundThreshold: 5,
        },
      }),
      spell: { ...bolt, staCost: 5 },
      dieRolls: [5],
    });
    expect(result.stunnedFromSta).toBe(true);
    expect(result.requiresStunSave).toBe(true);
  });

  it("hex category uses hexResolution rules (fail = no effect)", () => {
    const result = resolveMagicCast({
      character: mage(),
      spell: { ...bolt, category: "hex", name: "Hex of Shadows" },
      dieRolls: [2],
      dc: 25,
    });
    expect(result.spellSucceeds).toBe(false);
    expect(result.hexBackfire).toBe(false);
  });
});
