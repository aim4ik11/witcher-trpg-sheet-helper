/**
 * Rulebook: `curated/character-creation.md`, `curated/skills.md`, `sections/037-professions.md`
 */
import { describe, expect, it } from "vitest";
import {
  CREATION_SKILL_MAX,
  PROFESSION_PACKAGE_POINTS,
  attributePointsSpent,
  defaultAttributes,
  pickupSkillBudget,
  pickupSkillPointsUsed,
  professionPackagePointsUsed,
  validateCharacterCreation,
  validateCreationAttributes,
  validatePickupSkills,
  validateProfessionPackage,
} from "../characterCreation";

const allOnes = () => ({
  int: 1,
  ref: 1,
  dex: 1,
  body: 1,
  spd: 1,
  emp: 1,
  cra: 1,
  will: 1,
  luck: 1,
});

/** Bard profession package only — 11 skills + defining Busking (EMP), 44 pts total. */
function filledBardPackage(treeLevel = 6) {
  const professionTree = { "Bard:core": treeLevel };
  const skills = {
    int: {
      language: { level: 2 },
      streetwise: { level: 4 },
      socialEtiquette: { level: 4 },
    },
    emp: {
      charisma: { level: 4 },
      deceit: { level: 4 },
      performance: { level: 4 },
      humanPercep: { level: 4 },
      persuasion: { level: 3 },
      fineArts: { level: 3 },
      seduction: { level: 4 },
    },
  };
  return { skills, professionTree };
}

describe("rulebook creation — stat point buy", () => {
  it("each stat must be 1–10 and total must equal campaign budget", () => {
    const attrs = {
      ...allOnes(),
      int: 10,
      ref: 10,
      dex: 10,
      body: 10,
      spd: 10,
      emp: 10,
      cra: 7,
      luck: 2,
    };
    expect(attributePointsSpent(attrs)).toBe(70);
    expect(validateCreationAttributes(attrs, 70)).toBeNull();
    expect(validateCreationAttributes(attrs, 60)).toMatch(/exactly 60/);
  });

  it("rejects stats below 1 or above 10 at creation", () => {
    expect(validateCreationAttributes({ ...allOnes(), body: 0 }, 60)).toMatch(/at least 1/);
    expect(validateCreationAttributes({ ...allOnes(), body: 11 }, 60)).toMatch(/cannot exceed 10/);
  });

  it("fresh characters start with 1 in every stat", () => {
    expect(defaultAttributes()).toEqual(allOnes());
  });
});

describe("rulebook creation — profession package (44 points, min 1 each)", () => {
  it("Bard package with defining skill 6 uses exactly 44 points", () => {
    const { skills, professionTree } = filledBardPackage(6);
    const used = professionPackagePointsUsed("Bard", skills, professionTree);
    expect(used).toBe(PROFESSION_PACKAGE_POINTS);
    expect(validateProfessionPackage("Bard", skills, professionTree)).toBeNull();
  });

  it("special (2) skills cost double in the package", () => {
    const { skills, professionTree } = filledBardPackage(6);
    const withoutLanguage = structuredClone(skills);
    withoutLanguage.int.language = { level: 1 };
    expect(professionPackagePointsUsed("Bard", withoutLanguage, professionTree)).toBe(42);
  });

  it("each package skill must be at least 1 and at most 6 at creation", () => {
    const { skills, professionTree } = filledBardPackage(0);
    expect(validateProfessionPackage("Bard", skills, professionTree)).toMatch(/at least 1/);
    const { skills: overSkills, professionTree: overTree } = filledBardPackage(7);
    expect(validateProfessionPackage("Bard", overSkills, overTree)).toMatch(
      String(CREATION_SKILL_MAX),
    );
  });
});

describe("rulebook creation — pickup skills (INT + REF budget)", () => {
  it("pickup budget equals INT + REF", () => {
    expect(pickupSkillBudget({ int: 5, ref: 7 })).toBe(12);
  });

  it("cannot spend pickup points on profession package skills", () => {
    const attrs = { ...allOnes(), int: 5, ref: 5 };
    const { skills: pkg } = filledBardPackage(6);
    const skills = { ...pkg, dex: { archery: { level: 3 } } };
    const used = pickupSkillPointsUsed("Bard", skills);
    expect(used).toBe(3);
    expect(validatePickupSkills("Bard", attrs, skills)).toBeNull();
  });

  it("rejects pickup spend over INT + REF", () => {
    const attrs = { ...allOnes(), int: 2, ref: 2 };
    const skills = { dex: { archery: { level: 5 } } };
    expect(validatePickupSkills("Bard", attrs, skills)).toMatch(/exceed INT \+ REF/);
  });
});

describe("rulebook creation — full validation", () => {
  it("accepts a legal skilled-tier Bard", () => {
    const attrs = {
      ...allOnes(),
      int: 8,
      ref: 7,
      dex: 8,
      body: 8,
      spd: 8,
      emp: 8,
      cra: 8,
      will: 7,
      luck: 8,
    };
    expect(attributePointsSpent(attrs)).toBe(70);
    const { skills, professionTree } = filledBardPackage(6);
    const err = validateCharacterCreation({
      race: "Human",
      occupation: "Bard",
      attributes: attrs,
      skills,
      professionTree,
      creation: { complete: false, pointBuy: 70, level: 1 },
    });
    expect(err).toBeNull();
  });
});
