/**
 * Rulebook: `sections/166-magic-resolution.md` p.168, `sections/116-rituals.md`
 */
import { describe, expect, it } from "vitest";
import {
  groupRitualDcReduction,
  removedFromAreaContinueDc,
  resolveRitualCraft,
  ritualInterruptionContinueDc,
  type RitualDefinition,
} from "../ritualResolution";

const cleansingRitual: RitualDefinition = {
  id: "cleansing",
  name: "Cleansing Ritual",
  preparationRounds: 5,
  dc: 15,
  staCost: 3,
  components: ["Chalk", "Spirits", "Mistletoe"],
};

describe("rulebook §168 — ritual crafting outcomes", () => {
  it("success → ritual effect, components consumed on fail only", () => {
    const ok = resolveRitualCraft({
      ritual: cleansingRitual,
      ritualCraftingTotal: 20,
      vigorSpent: 3,
    });
    expect(ok.success).toBe(true);
    expect(ok.ritualEffect).toBe(true);
    expect(ok.componentsConsumed).toBe(false);
  });

  it("failure → no effect, components used up", () => {
    const fail = resolveRitualCraft({
      ritual: cleansingRitual,
      ritualCraftingTotal: 10,
      vigorSpent: 3,
    });
    expect(fail.success).toBe(false);
    expect(fail.ritualEffect).toBe(false);
    expect(fail.componentsConsumed).toBe(true);
  });

  it("fumble → 1 HP damage per vigor spent (§166 p.168)", () => {
    const fumble = resolveRitualCraft({
      ritual: cleansingRitual,
      ritualCraftingTotal: 1,
      vigorSpent: 6,
      dieRolls: [1],
      fumbleSecondRoll: 4,
    });
    expect(fumble.fumble).toBe(true);
    expect(fumble.fumbleHpDamage).toBe(6);
    expect(fumble.ritualEffect).toBe(false);
  });
});

describe("rulebook §168 — ritual interruption continue DCs", () => {
  it("shaken, bumped, yelled at, or tossed object → DC 15", () => {
    expect(ritualInterruptionContinueDc("shaken_bumped_yelled")).toBe(15);
  });

  it("attacked and physically harmed → DC 18", () => {
    expect(ritualInterruptionContinueDc("physically_harmed")).toBe(18);
  });

  it("removed from area: return within 1 round + DC 16 Ritual Crafting", () => {
    expect(removedFromAreaContinueDc()).toBe(16);
  });
});

describe("rulebook §168 — group rituals", () => {
  it.each([
    [0, 0],
    [1, 1],
    [4, 4],
    [5, 4],
    [10, 4],
  ])("%i helpers lowers DC by %i (max 4)", (helpers, reduction) => {
    expect(groupRitualDcReduction(helpers)).toBe(reduction);
  });

  it("helpers reduce effective ritual DC", () => {
    const withHelpers = resolveRitualCraft({
      ritual: { ...cleansingRitual, dc: 18 },
      ritualCraftingTotal: 17,
      vigorSpent: 3,
      helpers: 2,
    });
    expect(withHelpers.effectiveDc).toBe(16);
    expect(withHelpers.success).toBe(true);
  });
});

describe("rulebook §116 — cleansing ritual variable DCs (documented)", () => {
  it("alcohol/drugs DC 12, poisons DC 15, major illness DC 18", () => {
    const alcohol = resolveRitualCraft({
      ritual: { ...cleansingRitual, dc: 12 },
      ritualCraftingTotal: 14,
      vigorSpent: 3,
    });
    const poison = resolveRitualCraft({
      ritual: { ...cleansingRitual, dc: 15 },
      ritualCraftingTotal: 14,
      vigorSpent: 3,
    });
    expect(alcohol.success).toBe(true);
    expect(poison.success).toBe(false);
  });
});
