/**
 * Rulebook: `sections/061-skill-trees.md`
 */
import { describe, expect, it } from "vitest";
import {
  TREE_UNLOCK_AT,
  abilityBase,
  buildVisibleTree,
  coreAbilityId,
  getProfessionTree,
  getTreeLevel,
  isAbilityVisible,
  pathAbilityId,
} from "../skillTrees";

const bardCharacter = {
  occupation: "Bard",
  attributes: { emp: 8, int: 6 },
  professionTree: { "Bard:core": 6 },
};

describe("rulebook §061 — profession skill trees", () => {
  it("each core profession has a skill tree with a defining core ability", () => {
    for (const occ of ["Bard", "Mage", "Witcher", "Doctor"]) {
      const tree = getProfessionTree(occ);
      expect(tree?.core.name).toBeTruthy();
      expect(tree?.paths.length).toBeGreaterThan(0);
    }
  });

  it("Bard core ability is Busking on EMP", () => {
    const tree = getProfessionTree("Bard")!;
    expect(tree.core).toEqual(
      expect.objectContaining({ name: "Busking", stat: "emp" }),
    );
  });

  it("ability check base equals attribute + ability level", () => {
    const tree = getProfessionTree("Bard")!;
    expect(abilityBase(bardCharacter, tree.core, 6)).toBe(8 + 6);
  });

  it("path tier 1 is hidden until core reaches 5", () => {
    const tree = getProfessionTree("Bard")!;
    const tier1 = pathAbilityId("Bard", 0, 1);
    const lowCore = { ...bardCharacter, professionTree: { "Bard:core": 4 } };
    expect(isAbilityVisible(lowCore, tree, tier1)).toBe(false);
    expect(isAbilityVisible(bardCharacter, tree, tier1)).toBe(true);
  });

  it("tier 2 requires parent tier 1 at 5", () => {
    const tree = getProfessionTree("Bard")!;
    const t1 = pathAbilityId("Bard", 0, 1);
    const t2 = pathAbilityId("Bard", 0, 2);
    const partial = {
      ...bardCharacter,
      professionTree: { "Bard:core": 6, [t1]: 4 },
    };
    expect(isAbilityVisible(partial, tree, t2)).toBe(false);
    const unlocked = {
      ...bardCharacter,
      professionTree: { "Bard:core": 6, [t1]: 5 },
    };
    expect(isAbilityVisible(unlocked, tree, t2)).toBe(true);
  });

  it("TREE_UNLOCK_AT is 5 per rulebook", () => {
    expect(TREE_UNLOCK_AT).toBe(5);
  });

  it("buildVisibleTree exposes core and unlocked path tiers only", () => {
    const view = buildVisibleTree(bardCharacter, getProfessionTree("Bard")!, "Bard");
    expect(view.core.id).toBe(coreAbilityId("Bard"));
    expect(view.core.level).toBe(6);
    expect(view.paths[0]!.tiers.length).toBeGreaterThan(0);
  });

  it("migrates legacy definingSkillLevel into core tree level", () => {
    expect(
      getTreeLevel({ occupation: "Bard", definingSkillLevel: 4 }, coreAbilityId("Bard")),
    ).toBe(4);
  });
});
