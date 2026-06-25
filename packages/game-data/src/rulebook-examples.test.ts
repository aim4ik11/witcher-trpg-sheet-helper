/**
 * Definitive tests derived from the official rulebook worked examples.
 *
 * Sources:
 * - `data/rulebook/sections/172-example-combat.md` (p.172)
 * - `data/rulebook/sections/057-skill-resolution.md` (p.57)
 * - `data/rulebook/sections/151-combat-basics.md` (p.151–152)
 */
import { describe, expect, it } from "vitest";
import type { Character } from "@wilmak/shared";
import { compareAttackVsDefense, critWoundTierFromMargin, resolveAttack } from "./attack";
import { resolveInitiative } from "./combat";
import {
  applyDamageToCharacter,
  LOCATION_MULTIPLIERS,
  resolveDamageFromHit,
  rollHitLocation,
} from "./damage";
import { createSequenceRng, resolveManualSkillCheck } from "./dice";
import { evaluateSkillCheck } from "./skillCheck";

function minimalCharacter(
  overrides: Partial<Character> & Pick<Character, "id" | "name" | "type">,
): Character {
  return {
    attributes: { ref: 5, dex: 5, body: 5, will: 5 },
    skills: {},
    vitals: {
      hp: { current: 25, max: 25 },
      sta: { current: 10, max: 10 },
      woundThreshold: 5,
    },
    ...overrides,
  } as Character;
}

/** Rulebook p.172 — ghoul with 25 HP, steel-resistant necrophage. */
function exampleGhoul(): Character {
  return minimalCharacter({
    id: "ghoul-a",
    name: "Ghoul A",
    type: "enemy",
    enemyKind: "monster",
    monsterProfile: { catalogId: "ghouls", monsterType: "Necrophage", naturalArmor: 0 },
    vitals: {
      hp: { current: 25, max: 25 },
      sta: { current: 10, max: 10 },
      woundThreshold: 5,
    },
  });
}

describe("rulebook §057 skill resolution examples", () => {
  it("Geralt hits mercenary captain (29 vs 19)", () => {
    const geralt = resolveManualSkillCheck({
      base: 13 + 11,
      dieRolls: [5],
    });
    const mercenary = resolveManualSkillCheck({
      base: 7 + 6,
      dieRolls: [6],
    });
    expect(geralt.total).toBe(29);
    expect(mercenary.total).toBe(19);
    expect(compareAttackVsDefense(geralt.total, mercenary.total).hit).toBe(true);
    expect(compareAttackVsDefense(geralt.total, mercenary.total).margin).toBe(10);
  });

  it("Dandelion picks cheap lock (13 vs DC 10)", () => {
    const check = evaluateSkillCheck({
      base: 5 + 5,
      dc: 10,
      dieRolls: [3],
    });
    expect(check.total).toBe(13);
    expect(check.success).toBe(true);
  });

  it("Ermion casts Friend to Wildkind (28 vs WILL×3 = 12)", () => {
    const wolfWill = 4;
    const dc = wolfWill * 3;
    const check = evaluateSkillCheck({
      base: 10 + 9,
      dc,
      dieRolls: [9],
    });
    expect(dc).toBe(12);
    expect(check.total).toBe(28);
    expect(check.success).toBe(true);
  });
});

describe("rulebook §151 fumble and critical chains", () => {
  it("fumble: REF 7 + Swordsmanship 6, open 1 then 7 → total 6", () => {
    const result = resolveManualSkillCheck({
      base: 7 + 6,
      dieRolls: [1, 7],
    });
    expect(result.outcome).toBe("fumble");
    expect(result.effectiveBase).toBe(6);
    expect(result.total).toBe(6);
  });

  it("critical: natural 10 then 7 → die contribution 17", () => {
    const result = resolveManualSkillCheck({
      base: 10,
      dieRolls: [10, 7],
    });
    expect(result.outcome).toBe("critical");
    expect(result.dieTotal).toBe(17);
    expect(result.total).toBe(27);
  });
});

describe("rulebook §151 initiative", () => {
  it("initiative is REF + 1d10 (plain, no open-ended chains)", () => {
    expect(resolveInitiative(8, 4).initiative).toBe(12);
  });
});

describe("rulebook §151 defender wins on a tie", () => {
  it("attack total equal to defense is not a hit", () => {
    const { hit, margin } = compareAttackVsDefense(22, 22);
    expect(hit).toBe(false);
    expect(margin).toBe(0);
  });
});

describe("rulebook §172 example combat — attack vs defense", () => {
  const bow = { name: "Long Bow", dmg: "4d6", wa: 0, isRanged: true };
  const sword = { name: "Steel Longsword", dmg: "4d6+4", wa: 0, isRanged: false };

  it("Wren 23 beats ghoul dodge 22 (p.172 totals)", () => {
    expect(compareAttackVsDefense(23, 22).hit).toBe(true);
    expect(compareAttackVsDefense(23, 22).margin).toBe(1);
  });

  it("Johan parry 22 beats ghoul attack 19 (p.172 totals)", () => {
    expect(compareAttackVsDefense(19, 22).hit).toBe(false);
  });

  it("Wren hits ghoul A via DEX+Archery vs DEX+Dodge/Escape", () => {
    const wren = minimalCharacter({
      id: "wren",
      name: "Wren",
      type: "player",
      attributes: { dex: 10, ref: 5 },
      skills: { dex: { archery: { level: 6 } } },
    });
    const ghoul = exampleGhoul();
    ghoul.attributes = { dex: 8, ref: 5 };
    ghoul.skills = { dex: { dodgeEscape: { level: 8 } } };

    const result = resolveAttack({
      attacker: wren,
      target: ghoul,
      weapon: bow,
      attackType: "normal",
      defenseType: "dodge",
      attackerDieRolls: [7],
      defenderDieRolls: [6],
    });
    expect(result.attackRoll.total).toBe(23);
    expect(result.defenseRoll?.total).toBe(22);
    expect(result.hit).toBe(true);
  });

  it("Johan blocks ghoul C with REF+Swordsmanship (p.172)", () => {
    const johan = minimalCharacter({
      id: "johan",
      name: "Johan",
      type: "player",
      attributes: { ref: 8, dex: 5 },
      skills: { ref: { swordsmanship: { level: 8 } } },
    });
    const ghoul = exampleGhoul();
    ghoul.id = "ghoul-c";
    ghoul.attributes = { ref: 6, dex: 5 };
    ghoul.skills = { ref: { brawling: { level: 5 } } };

    const result = resolveAttack({
      attacker: ghoul,
      target: johan,
      weapon: { name: "Claws", dmg: "2d6", wa: 0, isRanged: false, isUnarmed: true },
      attackType: "normal",
      defenseType: "block",
      blockSkillKey: "swordsmanship",
      attackerDieRolls: [8],
      defenderDieRolls: [6],
    });
    expect(result.attackRoll.total).toBe(19);
    expect(result.defenseRoll?.total).toBe(22);
    expect(result.hit).toBe(false);
  });

  it("Johan hits stunned ghoul B on head (15 vs none, deadly critical)", () => {
    const johan = minimalCharacter({
      id: "johan",
      name: "Johan",
      type: "player",
      attributes: { ref: 5, dex: 5 },
      skills: { ref: { swordsmanship: { level: 6 } } },
    });
    const ghoul = exampleGhoul();
    ghoul.id = "ghoul-b";

    const result = resolveAttack({
      attacker: johan,
      target: ghoul,
      weapon: sword,
      attackType: "normal",
      defenseType: "none",
      modifiers: [{ label: "Aimed head", value: -6 }],
      attackerDieRolls: [10],
      defenseDc: 0,
    });
    expect(result.attackRoll.total).toBe(15);
    expect(result.hit).toBe(true);
    expect(result.critWoundTier).toBe("deadly");
  });
});

describe("rulebook §172 example combat — damage", () => {
  const bow = { name: "Long Bow", dmg: "4d6", wa: 0, isRanged: true };
  const steelSword = { name: "Steel Longsword", dmg: "4d6+4", wa: 0, isRanged: false };

  it("Wren: longbow 20, steel halved, left leg halved → 5 damage (p.172)", () => {
    const ghoul = exampleGhoul();
    const result = resolveDamageFromHit({
      target: ghoul,
      weapon: bow,
      attackType: "normal",
      critWoundTier: "none",
      aimedLocation: "lLeg",
      rng: createSequenceRng([0.92, 0.75, 0.75, 0.58]),
    });
    expect(result.rawDamage).toBe(20);
    expect(result.damageAfterResistance).toBe(10);
    expect(result.finalDamage).toBe(5);
    const updated = applyDamageToCharacter(ghoul, {
      id: "x",
      round: 1,
      attackerId: "wren",
      attackerName: "Wren",
      targetId: ghoul.id,
      targetName: ghoul.name,
      attackType: "normal",
      weapon: bow,
      defenseType: "dodge",
      modifiers: [],
      attackRoll: {
        outcome: "normal",
        rolls: [7],
        statSkillBase: 16,
        effectiveBase: 16,
        base: 16,
        modifier: 0,
        total: 23,
      },
      hit: true,
      margin: 1,
      critWoundTier: "none",
      finalDamage: result.finalDamage,
      timestamp: "",
    });
    expect(updated.vitals.hp.current).toBe(20);
  });

  it("Johan: 4d6+4 + deadly crit = 25, steel halved, head ×3 → 36 (p.172)", () => {
    const ghoul = exampleGhoul();
    const result = resolveDamageFromHit({
      target: ghoul,
      weapon: steelSword,
      attackType: "normal",
      critWoundTier: "deadly",
      aimedLocation: "head",
      rng: createSequenceRng([0.25, 0.25, 0.38, 0.65]),
    });
    expect(result.damageDiceSum).toBe(11);
    expect(result.critWoundDamageBonus).toBe(10);
    expect(result.rawDamage).toBe(25);
    expect(result.damageAfterResistance).toBe(12);
    expect(result.finalDamage).toBe(36);
  });

  it("location roll 9 on humanoid is left leg (p.152)", () => {
    const ghoul = exampleGhoul();
    const { location, roll } = rollHitLocation(ghoul, undefined, createSequenceRng([0.85]));
    expect(roll).toBe(9);
    expect(location).toBe("lLeg");
    expect(LOCATION_MULTIPLIERS.lLeg).toBe(0.5);
  });
});

describe("rulebook §151 critical wound margins", () => {
  it("maps beat-by values from the critical table", () => {
    expect(critWoundTierFromMargin(6)).toBe("none");
    expect(critWoundTierFromMargin(7)).toBe("simple");
    expect(critWoundTierFromMargin(10)).toBe("complex");
    expect(critWoundTierFromMargin(13)).toBe("difficult");
    expect(critWoundTierFromMargin(15)).toBe("deadly");
  });
});
