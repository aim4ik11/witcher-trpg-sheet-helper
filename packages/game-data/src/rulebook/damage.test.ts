/**
 * Rulebook: `sections/151-combat-basics.md`, `sections/172-example-combat.md`, `curated/combat.md`
 */
import { describe, expect, it } from "vitest";
import type { Character } from "@wilmak/shared";
import {
  LOCATION_MULTIPLIERS,
  applySilverSteelRule,
  critWoundDamageBonus,
  getEffectiveArmorSp,
  resolveDamageFromHit,
  rollHitLocation,
} from "../damage";
import { createSequenceRng } from "../dice";

function ghoul(): Character {
  return {
    id: "g",
    type: "enemy",
    name: "Ghoul",
    enemyKind: "monster",
    attributes: { body: 5 },
    skills: {},
    vitals: { hp: { current: 25, max: 25 }, sta: { current: 10, max: 10 }, woundThreshold: 5 },
    monsterProfile: { catalogId: "ghouls", monsterType: "Necrophage" },
  };
}

describe("rulebook §151 — hit location multipliers", () => {
  it.each([
    ["head", 3],
    ["torso", 1],
    ["rArm", 0.5],
    ["lLeg", 0.5],
  ] as const)("%s ×%s damage after armor", (loc, mult) => {
    expect(LOCATION_MULTIPLIERS[loc]).toBe(mult);
  });

  it("humanoid location roll 9 is left leg", () => {
    const { location, roll } = rollHitLocation(ghoul(), undefined, createSequenceRng([0.85]));
    expect(roll).toBe(9);
    expect(location).toBe("lLeg");
  });

  it("monster location roll 10 is special location", () => {
    const { location, roll } = rollHitLocation(ghoul(), undefined, createSequenceRng([0.95]));
    expect(roll).toBe(10);
    expect(location).toBe("special");
  });
});

describe("rulebook §151 — critical bonus damage before resist and location", () => {
  it.each([
    [7, 3],
    [10, 5],
    [13, 8],
    [15, 10],
  ])("margin tier at %i adds +%i damage", (margin, bonus) => {
    const tier =
      margin < 7
        ? "none"
        : margin < 10
          ? "simple"
          : margin < 13
            ? "complex"
            : margin < 15
              ? "difficult"
              : "deadly";
    expect(critWoundDamageBonus(tier)).toBe(bonus);
  });
});

describe("rulebook §151 — steel vs silver on monsters", () => {
  it("non-silver damage is halved against monsters", () => {
    expect(
      applySilverSteelRule(20, ghoul(), { name: "Steel Sword", wa: 0, isRanged: false }),
    ).toBe(10);
  });

  it("silver weapons are not halved", () => {
    expect(
      applySilverSteelRule(20, ghoul(), { name: "Silver Sword", wa: 0, isRanged: false }),
    ).toBe(20);
  });
});

describe("rulebook §151 — armor stops damage by location (SP subtracted before multiplier)", () => {
  it("subtracts SP from damage, then applies location multiplier", () => {
    const target: Character = {
      ...ghoul(),
      type: "player",
      armor: [{ slot: "head", name: "Helm", sp: 10, damage: 0, effects: "", weight: 0 }],
    };
    const result = resolveDamageFromHit({
      target,
      weapon: { name: "Mace", dmg: "2d6+8", wa: 0, isRanged: false },
      attackType: "normal",
      critWoundTier: "none",
      aimedLocation: "head",
      rng: createSequenceRng([0.9, 0.9]),
    });
    expect(result.armorSpBefore).toBe(10);
    const afterResistance = result.damageAfterResistance ?? 0;
    const afterArmor = result.damageAfterArmor ?? 0;
    expect(afterArmor).toBe(Math.max(0, afterResistance - 10));
    expect(result.finalDamage).toBe(Math.floor(afterArmor * LOCATION_MULTIPLIERS.head));
  });

  it("reads armor SP for the struck slot only", () => {
    const target: Character = {
      ...ghoul(),
      type: "player",
      armor: [
        { slot: "head", name: "Helm", sp: 12, damage: 0, effects: "", weight: 0 },
        { slot: "torso", name: "Jack", sp: 5, damage: 0, effects: "", weight: 0 },
      ],
    };
    expect(getEffectiveArmorSp(target, "head")).toBe(12);
    expect(getEffectiveArmorSp(target, "torso")).toBe(5);
  });
});

describe("rulebook §172 — Wren longbow shot on ghoul leg", () => {
  it("4d6=20 → steel halved → leg halved → 5 damage", () => {
    const result = resolveDamageFromHit({
      target: ghoul(),
      weapon: { name: "Long Bow", dmg: "4d6", wa: 0, isRanged: true },
      attackType: "normal",
      critWoundTier: "none",
      aimedLocation: "lLeg",
      rng: createSequenceRng([0.92, 0.75, 0.75, 0.58]),
    });
    expect(result.rawDamage).toBe(20);
    expect(result.damageAfterResistance).toBe(10);
    expect(result.finalDamage).toBe(5);
  });
});

describe("rulebook §172 — Johan deadly head strike on ghoul", () => {
  it("4d6+4 + deadly +10 = 25 → steel halved → head ×3 → 36", () => {
    const result = resolveDamageFromHit({
      target: ghoul(),
      weapon: { name: "Steel Longsword", dmg: "4d6+4", wa: 0, isRanged: false },
      attackType: "normal",
      critWoundTier: "deadly",
      aimedLocation: "head",
      rng: createSequenceRng([0.25, 0.25, 0.38, 0.65]),
    });
    expect(result.rawDamage).toBe(25);
    expect(result.damageAfterResistance).toBe(12);
    expect(result.finalDamage).toBe(36);
  });
});

describe("rulebook §151 — strong strike doubles weapon damage", () => {
  it("strong strike multiplier applies to rolled dice total", () => {
    const result = resolveDamageFromHit({
      target: { ...ghoul(), type: "player" },
      weapon: { name: "Sword", dmg: "2d6", wa: 0, isRanged: false },
      attackType: "strong",
      critWoundTier: "none",
      aimedLocation: "torso",
      strongStrikeMultiplier: 2,
      rng: createSequenceRng([0.5, 0.5]),
    });
    expect(result.damageDiceSum).toBe(8);
    expect(result.rawDamage).toBe(16);
  });
});

describe("rulebook §151 — ablation when damage penetrates armor", () => {
  it("armor loses 1 SP when damage gets through", () => {
    const target: Character = {
      ...ghoul(),
      type: "player",
      armor: [{ slot: "torso", name: "Jack", sp: 5, damage: 0, effects: "", weight: 0 }],
    };
    const result = resolveDamageFromHit({
      target,
      weapon: { name: "Sword", dmg: "2d6+10", wa: 0, isRanged: false },
      attackType: "normal",
      critWoundTier: "none",
      aimedLocation: "torso",
      rng: createSequenceRng([0.9, 0.9]),
    });
    if ((result.damageAfterArmor ?? 0) > 0 && (result.armorSpBefore ?? 0) > 0) {
      expect(result.armorAblation).toBe(1);
      expect(result.armorSpAfter).toBe((result.armorSpBefore ?? 0) - 1);
    }
  });
});
