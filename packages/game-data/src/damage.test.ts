import { describe, expect, it } from "vitest";
import type { Character, CombatAttackResult } from "@wilmak/shared";
import { validateBestiaryCombatData } from "../src/monsters";
import { normalizeCharacter, restCharacterVitals } from "../src/normalizeCharacter";
import {
  attackTypeConfigForAttacker,
  critWoundTierFromMargin,
  isMonsterAttacker,
  isRangedWeapon,
} from "../src/attack";
import {
  applyDamageToCharacter,
  applySilverSteelRule,
  resolveDamageFromHit,
} from "../src/damage";
import { createSequenceRng } from "../src/dice";
import { woundThresholdFromMaxHp } from "../src/characterData";

function sampleCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: "c1",
    type: "enemy",
    name: "Test",
    enemyKind: "monster",
    attributes: { ref: 5, dex: 5, body: 5 },
    skills: {},
    vitals: {
      hp: { current: 40, max: 40 },
      sta: { current: 10, max: 10 },
      woundThreshold: 8,
    },
    armor: [
      { slot: "head", name: "Helm", sp: 10, damage: 0, effects: "", weight: 0 },
    ],
    ...overrides,
  };
}

describe("normalizeCharacter vitals", () => {
  it("strips legacy resolve and adrenaline", () => {
    const char = normalizeCharacter({
      type: "player",
      name: "Test",
      attributes: {
        int: 5,
        ref: 5,
        dex: 5,
        body: 5,
        spd: 5,
        emp: 5,
        cra: 5,
        will: 5,
        luck: 1,
      },
      skills: {},
      adrenaline: 3,
      vitals: {
        hp: { current: 20, max: 20 },
        sta: { current: 20, max: 20 },
        resolve: { current: 10, max: 10 },
        woundThreshold: 99,
      },
    });
    expect("adrenaline" in char).toBe(false);
    expect("resolve" in char.vitals).toBe(false);
    expect(char.vitals.woundThreshold).toBe(woundThresholdFromMaxHp(char.vitals.hp.max));
  });
});

describe("restCharacterVitals", () => {
  it("sets hp and sta current to max on first normalize for new characters", () => {
    const char = normalizeCharacter({
      type: "player",
      name: "Test",
      attributes: {
        int: 5,
        ref: 5,
        dex: 5,
        body: 5,
        spd: 5,
        emp: 5,
        cra: 5,
        will: 5,
        luck: 1,
      },
      skills: {},
      vitals: {
        hp: { current: 0, max: 0 },
        sta: { current: 0, max: 0 },
        woundThreshold: 0,
      },
    });
    expect(char.vitals.hp.current).toBe(char.vitals.hp.max);
    expect(char.vitals.sta.current).toBe(char.vitals.sta.max);
    expect(char.vitals.hp.max).toBeGreaterThan(0);
  });

  it("restores damaged hp and sta without changing max", () => {
    const wounded = sampleCharacter({
      bestiaryId: "drowners",
      vitals: {
        hp: { current: 10, max: 40 },
        sta: { current: 3, max: 20 },
        woundThreshold: 8,
      },
    });
    const rested = restCharacterVitals(wounded);
    expect(rested.vitals.hp).toEqual({ current: 40, max: 40 });
    expect(rested.vitals.sta).toEqual({ current: 20, max: 20 });
  });
});

describe("validateBestiaryCombatData", () => {
  it("reports no combat gaps in the monsters catalog", () => {
    const issues = validateBestiaryCombatData();
    expect(issues).toEqual([]);
  });
});

describe("attackTypeConfigForAttacker", () => {
  const claws = {
    id: "w1",
    name: "Claws",
    type: "",
    wa: 0,
    dmg: "6d6",
    rel: "",
    rateOfFire: 2,
    hand: "",
    rng: "",
    effect: "N/A",
    conc: "",
    enhancements: "",
    weight: 0,
  };

  it("gives monsters multi-attack from weapon ROF, no fast/strong", () => {
    const wyvern = sampleCharacter({
      name: "Wyvern",
      bestiaryId: "wyverns",
      weapons: [claws],
    });
    const combatWeapon = {
      id: claws.id,
      name: claws.name,
      dmg: claws.dmg,
      wa: 0,
      isRanged: false,
      rateOfFire: 2,
    };
    expect(isMonsterAttacker(wyvern)).toBe(true);
    expect(attackTypeConfigForAttacker(wyvern, "normal", combatWeapon, claws).attackCount).toBe(2);
    expect(attackTypeConfigForAttacker(wyvern, "fast", combatWeapon, claws).allowed).toBe(false);
    expect(attackTypeConfigForAttacker(wyvern, "strong", combatWeapon, claws).allowed).toBe(false);
  });
});

describe("isRangedWeapon", () => {
  it("does not treat catalog rng L/S as ranged for swords", () => {
    expect(isRangedWeapon({ name: "Longsword", rng: "L", hand: "1H" })).toBe(false);
    expect(isRangedWeapon({ name: "Arming Sword", rng: "S", hand: "1H" })).toBe(false);
  });

  it("detects bows and thrown weapons by name", () => {
    expect(isRangedWeapon({ name: "Longbow", rng: "", hand: "2H" })).toBe(true);
    expect(isRangedWeapon({ name: "Throwing Knife", rng: "", hand: "1H" })).toBe(true);
  });
});

describe("critWoundTierFromMargin", () => {
  it("maps margin thresholds per rulebook tiers", () => {
    expect(critWoundTierFromMargin(6)).toBe("none");
    expect(critWoundTierFromMargin(7)).toBe("simple");
    expect(critWoundTierFromMargin(9)).toBe("simple");
    expect(critWoundTierFromMargin(10)).toBe("complex");
    expect(critWoundTierFromMargin(12)).toBe("complex");
    expect(critWoundTierFromMargin(13)).toBe("difficult");
    expect(critWoundTierFromMargin(14)).toBe("difficult");
    expect(critWoundTierFromMargin(15)).toBe("deadly");
  });
});

describe("resolveDamageFromHit", () => {
  it("applies silver-steel halving, armor SP, and head multiplier", () => {
    const target = sampleCharacter({
      monsterProfile: { catalogId: "drowner", monsterType: "Necrophage", naturalArmor: 0 },
    });
    const rng = createSequenceRng([0.9, 0.9]);
    const result = resolveDamageFromHit({
      target,
      weapon: { name: "Steel Sword", dmg: "2d6+8", wa: 0, isRanged: false },
      attackType: "normal",
      critWoundTier: "none",
      aimedLocation: "head",
      strongStrikeMultiplier: 2,
      rng,
    });
    expect(result.rawDamage).toBe(40);
    expect(result.damageAfterResistance).toBe(20);
    expect(result.armorSpBefore).toBe(10);
    expect(result.damageAfterArmor).toBe(10);
    expect(result.locationMultiplier).toBe(3);
    expect(result.finalDamage).toBe(30);
  });
});

describe("applySilverSteelRule", () => {
  it("halves non-silver damage vs monsters", () => {
    const monster = sampleCharacter();
    expect(
      applySilverSteelRule(20, monster, { name: "Steel Sword", wa: 0, isRanged: false }),
    ).toBe(10);
    expect(
      applySilverSteelRule(20, monster, { name: "Silver Sword", wa: 0, isRanged: false }),
    ).toBe(20);
  });
});

describe("applyDamageToCharacter", () => {
  it("reduces HP and ablates armor on penetrating hits", () => {
    const character = sampleCharacter();
    const result: CombatAttackResult = {
      id: "a1",
      round: 1,
      attackerId: "a",
      attackerName: "Attacker",
      targetId: character.id,
      targetName: character.name,
      attackType: "normal",
      weapon: { name: "Sword", wa: 0, isRanged: false },
      defenseType: "dodge",
      modifiers: [],
      attackRoll: {
        outcome: "normal",
        rolls: [5],
        statSkillBase: 10,
        effectiveBase: 10,
        base: 10,
        modifier: 0,
        total: 15,
      },
      hit: true,
      margin: 3,
      critWoundTier: "none",
      finalDamage: 8,
      armorSlot: "head",
      armorAblation: 1,
      timestamp: new Date().toISOString(),
    };

    const updated = applyDamageToCharacter(character, result);
    expect(updated.vitals.hp.current).toBe(32);
    expect(updated.armor?.[0]?.sp).toBe(9);
    expect(updated.armor?.[0]?.damage).toBe(1);
  });
});
