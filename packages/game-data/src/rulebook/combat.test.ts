/**
 * Rulebook: `sections/151-combat-basics.md`, `sections/163-in-depth-combat.md`, `curated/combat.md`
 */
import { describe, expect, it } from "vitest";
import type { CombatState } from "@wilmak/shared";
import {
  AIM_LOCATION_PENALTIES,
  RANGE_MODIFIERS,
  advanceTurn,
  applyAttackToCombatState,
  attackTypeConfig,
  buildModifierList,
  compareAttackVsDefense,
  critWoundTierFromMargin,
  defenseModifier,
  getAllowedDefenseTypes,
} from "../attack";
import { createCombatState, sortCombatParticipants } from "../combat";

const sword = { name: "Longsword", dmg: "2d6+4", wa: 0, isRanged: false };
const bow = { name: "Longbow", dmg: "4d6", wa: 0, isRanged: true };
const crossbow = { name: "Hand Crossbow", dmg: "2d6+2", wa: 0, isRanged: true };

describe("rulebook §151 — attack modifiers table", () => {
  it("lists standard situational modifiers", () => {
    expect(buildModifierList({ targetDodging: true })).toContainEqual({
      label: "Target dodging",
      value: -2,
    });
    expect(buildModifierList({ ambush: true })).toContainEqual({
      label: "Ambush",
      value: 5,
    });
    expect(buildModifierList({ fastDraw: true })).toContainEqual({
      label: "Fast draw",
      value: -3,
    });
    expect(buildModifierList({ outsideVisionCone: true })).toContainEqual({
      label: "Outside vision cone",
      value: -3,
    });
  });

  it("aim location penalties match humanoid table", () => {
    expect(AIM_LOCATION_PENALTIES.head).toBe(-6);
    expect(AIM_LOCATION_PENALTIES.torso).toBe(-1);
    expect(AIM_LOCATION_PENALTIES.rLeg).toBe(-2);
    expect(AIM_LOCATION_PENALTIES.lArm).toBe(-3);
  });

  it("ranged bands match range modifier table", () => {
    expect(RANGE_MODIFIERS.pointBlank).toBe(5);
    expect(RANGE_MODIFIERS.close).toBe(0);
    expect(RANGE_MODIFIERS.medium).toBe(-2);
    expect(RANGE_MODIFIERS.long).toBe(-4);
    expect(RANGE_MODIFIERS.extreme).toBe(-6);
  });
});

describe("rulebook §151 — fast vs strong strikes", () => {
  it("fast strike: two attacks in one round (melee)", () => {
    const cfg = attackTypeConfig("fast", sword);
    expect(cfg.allowed).toBe(true);
    expect(cfg.attackCount).toBe(2);
    expect(cfg.attackModifier).toBe(0);
  });

  it("bows fire once even on fast strike", () => {
    const cfg = attackTypeConfig("fast", bow);
    expect(cfg.attackCount).toBe(1);
  });

  it("crossbows cannot fast or strong strike", () => {
    expect(attackTypeConfig("fast", crossbow).allowed).toBe(false);
    expect(attackTypeConfig("strong", crossbow).allowed).toBe(false);
  });

  it("strong strike: −3 to attack, double damage", () => {
    const cfg = attackTypeConfig("strong", sword);
    expect(cfg.attackModifier).toBe(-3);
    expect(cfg.damageMultiplier).toBe(2);
  });

  it("extra attack costs 1 STA and applies −3", () => {
    const cfg = attackTypeConfig("extra", sword);
    expect(cfg.costsSta).toBe(true);
    expect(cfg.attackModifier).toBe(-3);
  });
});

describe("rulebook §151 — critical wound margins", () => {
  it.each([
    [6, "none"],
    [7, "simple"],
    [9, "simple"],
    [10, "complex"],
    [12, "complex"],
    [13, "difficult"],
    [14, "difficult"],
    [15, "deadly"],
    [20, "deadly"],
  ])("beat defense by %i → %s critical", (margin, tier) => {
    expect(critWoundTierFromMargin(margin)).toBe(tier);
  });
});

describe("rulebook §151 — defense", () => {
  it("parry imposes −3; thrown weapons add −2 more vs parry", () => {
    expect(defenseModifier("parry", sword)).toBe(-3);
    expect(defenseModifier("parry", { ...sword, isThrown: true, name: "Throwing Knife" })).toBe(
      -5,
    );
  });

  it("ranged weapons cannot be parried; melee can dodge, block, parry", () => {
    expect(getAllowedDefenseTypes(bow)).not.toContain("parry");
    expect(getAllowedDefenseTypes(sword)).toContain("parry");
    expect(getAllowedDefenseTypes(sword)).toContain("dodge");
  });
});

describe("rulebook §151 — STA costs per round", () => {
  it("tracks extra attack STA on attacker", () => {
    const combat = createCombatState([
      {
        characterId: "a",
        name: "A",
        type: "player",
        ref: 5,
        dieRoll: 5,
        initiative: 10,
      },
      {
        characterId: "b",
        name: "B",
        type: "enemy",
        ref: 5,
        dieRoll: 4,
        initiative: 9,
      },
    ]);
    const next = applyAttackToCombatState(combat, [
      {
        id: "1",
        round: 1,
        attackerId: "a",
        attackerName: "A",
        targetId: "b",
        targetName: "B",
        attackType: "extra",
        weapon: sword,
        defenseType: "dodge",
        modifiers: [],
        attackRoll: {
          outcome: "normal",
          rolls: [5],
          statSkillBase: 10,
          effectiveBase: 10,
          base: 10,
          modifier: -3,
          total: 12,
        },
        hit: true,
        margin: 2,
        critWoundTier: "none",
        staCost: 1,
        timestamp: "",
      },
    ]);
    expect(next.participants.find((p) => p.characterId === "a")?.staSpentThisRound).toBe(1);
  });

  it("second defense in a round costs 1 STA", () => {
    const combat: CombatState = {
      active: true,
      round: 1,
      currentTurnIndex: 0,
      participants: [
        {
          characterId: "d",
          name: "Defender",
          type: "player",
          ref: 5,
          dieRoll: 5,
          initiative: 10,
          defensesThisRound: 1,
        },
      ],
      attackLog: [],
    };
    const next = applyAttackToCombatState(combat, [
      {
        id: "1",
        round: 1,
        attackerId: "a",
        attackerName: "A",
        targetId: "d",
        targetName: "Defender",
        attackType: "normal",
        weapon: sword,
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
        defenseRoll: {
          outcome: "normal",
          rolls: [6],
          statSkillBase: 10,
          effectiveBase: 10,
          base: 10,
          modifier: 0,
          total: 16,
        },
        hit: false,
        margin: -1,
        critWoundTier: "none",
        timestamp: "",
      },
    ]);
    const defender = next.participants.find((p) => p.characterId === "d");
    expect(defender?.defensesThisRound).toBe(2);
    expect(defender?.staSpentThisRound).toBe(1);
  });
});

describe("rulebook §151 — initiative order", () => {
  it("sorts highest initiative first; ties by higher die", () => {
    const sorted = sortCombatParticipants([
      { characterId: "1", name: "Low", type: "player", ref: 3, dieRoll: 2, initiative: 5 },
      { characterId: "2", name: "High", type: "player", ref: 8, dieRoll: 4, initiative: 12 },
      { characterId: "3", name: "TieLow", type: "player", ref: 5, dieRoll: 3, initiative: 8 },
      { characterId: "4", name: "TieHigh", type: "player", ref: 5, dieRoll: 7, initiative: 12 },
    ]);
    expect(sorted.map((p) => p.name)).toEqual(["TieHigh", "High", "TieLow", "Low"]);
  });
});

describe("rulebook §151 — combat rounds", () => {
  it("advancing past last participant starts a new round and clears per-round flags", () => {
    const combat = createCombatState([
      {
        characterId: "a",
        name: "A",
        type: "player",
        ref: 5,
        dieRoll: 8,
        initiative: 13,
        actionUsed: true,
        staSpentThisRound: 2,
        defensesThisRound: 1,
      },
      {
        characterId: "b",
        name: "B",
        type: "enemy",
        ref: 3,
        dieRoll: 4,
        initiative: 7,
      },
    ]);
    const afterOne = advanceTurn(combat);
    expect(afterOne.currentTurnIndex).toBe(1);
    expect(afterOne.round).toBe(1);

    const afterRound = advanceTurn(afterOne);
    expect(afterRound.round).toBe(2);
    expect(afterRound.currentTurnIndex).toBe(0);
    expect(afterRound.participants.every((p) => !p.actionUsed)).toBe(true);
    expect(afterRound.participants.every((p) => (p.staSpentThisRound ?? 0) === 0)).toBe(true);
  });
});

describe("rulebook §151 — hit resolution", () => {
  it("attack must exceed defense total", () => {
    expect(compareAttackVsDefense(23, 22)).toEqual({ hit: true, margin: 1 });
    expect(compareAttackVsDefense(19, 22)).toEqual({ hit: false, margin: -3 });
  });
});
