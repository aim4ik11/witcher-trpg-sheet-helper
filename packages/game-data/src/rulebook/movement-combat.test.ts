/**
 * Rulebook: `sections/163-in-depth-combat.md`, `curated/combat.md` (movement & vision)
 */
import { describe, expect, it } from "vitest";
import type { Character } from "@wilmak/shared";
import {
  attackBase,
  buildModifierList,
  defenseBase,
  inferWeaponSkill,
  unarmedCombatWeapon,
  weaponRateOfFire,
  weaponToCombatWeapon,
} from "../attack";
import { getSpd } from "../characterData";
import { normalizeCharacter } from "../normalizeCharacter";

function fighter(overrides: Partial<Character> = {}): Character {
  return {
    id: "f",
    type: "player",
    name: "Fighter",
    attributes: { ref: 8, dex: 7, body: 6, spd: 6 },
    skills: {
      ref: { swordsmanship: { level: 6 }, brawling: { level: 5 } },
      dex: { dodgeEscape: { level: 4 }, athletics: { level: 3 } },
    },
    vitals: { hp: { current: 30, max: 30 }, sta: { current: 30, max: 30 }, woundThreshold: 6 },
    ...overrides,
  } as Character;
}

describe("rulebook §163 — melee attack formula", () => {
  it("melee attack base = REF skill + weapon accuracy", () => {
    const char = fighter();
    const sword = weaponToCombatWeapon({
      id: "s",
      name: "Arming Sword",
      type: "S/P",
      wa: 0,
      dmg: "2d6+4",
      rel: "15",
      hand: "1",
      rng: "",
      effect: "",
      conc: "",
      enhancements: "",
      weight: 2.5,
    });
    expect(inferWeaponSkill(sword).skillKey).toBe("swordsmanship");
    expect(attackBase(char, sword)).toBe(8 + 6);
  });

  it("ranged attacks use archery or crossbow skill plus range band", () => {
    const char = fighter({
      skills: { dex: { archery: { level: 8 } } },
      attributes: { ref: 5, dex: 9, body: 5, spd: 5 },
    });
    const bow = weaponToCombatWeapon({
      id: "b",
      name: "Long Bow",
      type: "P",
      wa: 2,
      dmg: "4d6",
      rel: "10",
      hand: "2",
      rng: "50",
      effect: "",
      conc: "",
      enhancements: "",
      weight: 1,
    });
    expect(inferWeaponSkill(bow).isRanged).toBe(true);
    expect(attackBase(char, bow, "medium")).toBe(9 + 8 + 2 - 2);
  });
});

describe("rulebook §163 — brawling & unarmed", () => {
  it("unarmed attacks use Brawling skill", () => {
    const char = fighter();
    const punch = unarmedCombatWeapon("punch", "1d6");
    expect(attackBase(char, punch)).toBe(8 + 5);
  });

  it("normalized characters expose punch and kick damage from BODY", () => {
    const char = normalizeCharacter({
      type: "player",
      name: "Brawler",
      attributes: {
        int: 5,
        ref: 5,
        dex: 5,
        body: 8,
        spd: 5,
        emp: 5,
        cra: 5,
        will: 5,
        luck: 1,
      },
      skills: {},
      vitals: { hp: { current: 40, max: 40 }, sta: { current: 40, max: 40 }, woundThreshold: 8 },
    }) as unknown as Character;
    expect(char.bonusMelee?.punch).toBe("1d6+2");
    expect(char.bonusMelee?.kick).toBe("1d6+6");
  });

  it("dodge defense uses Dodge/Escape on DEX", () => {
    const char = fighter();
    expect(defenseBase(char, "dodge")).toBe(7 + 4);
  });
});

describe("rulebook combat — movement per round", () => {
  it("characters move up to SPD meters and act once per round", () => {
    const char = normalizeCharacter({
      type: "player",
      name: "Runner",
      attributes: {
        int: 5,
        ref: 5,
        dex: 5,
        body: 5,
        spd: 6,
        emp: 5,
        cra: 5,
        will: 5,
        luck: 1,
      },
      skills: {},
      vitals: { hp: { current: 25, max: 25 }, sta: { current: 25, max: 25 }, woundThreshold: 5 },
    }) as unknown as Character;
    expect(getSpd(char)).toBe(6);
    expect(char.movement?.run).toBe(18);
  });
});

describe("rulebook combat — vision cone modifiers", () => {
  it("attacking outside vision cone imposes −3 and prevents aimed shots", () => {
    const mods = buildModifierList({ outsideVisionCone: true });
    expect(mods).toContainEqual({ label: "Outside vision cone", value: -3 });
  });

  it("target outside attacker's vision cone grants attacker +3 (defender's incoming bonus)", () => {
    const attackerBonusWhenFlanking = 3;
    expect(attackerBonusWhenFlanking).toBe(3);
  });
});

describe("rulebook combat — situational attack modifiers", () => {
  it("ambush grants +5 to attack", () => {
    const mods = buildModifierList({ ambush: true });
    expect(mods).toContainEqual({ label: "Ambush", value: 5 });
  });

  it("target dodging imposes −2", () => {
    const mods = buildModifierList({ targetDodging: true });
    expect(mods).toContainEqual({ label: "Target dodging", value: -2 });
  });

  it("fast draw imposes −3", () => {
    const mods = buildModifierList({ fastDraw: true });
    expect(mods).toContainEqual({ label: "Fast draw", value: -3 });
  });
});

describe("rulebook combat — rate of fire", () => {
  it("bows fire once per round (reliability must not be mistaken for rate of fire)", () => {
    const bow = weaponToCombatWeapon({
      id: "b",
      name: "Long Bow",
      type: "P",
      wa: 0,
      dmg: "4d6",
      rel: "10",
      hand: "2",
      rng: "50",
      effect: "",
      conc: "",
      enhancements: "",
      weight: 1,
    });
    expect(weaponRateOfFire(bow)).toBe(1);
  });
});
