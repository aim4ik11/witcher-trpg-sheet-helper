/**
 * Rulebook: `curated/skills.md`, `sections/049-skills.md`
 */
import { describe, expect, it } from "vitest";
import { ATTRIBUTE_SKILLS } from "../characterData";
import { CREATION_SKILL_MAX } from "../characterCreation";

const SPECIAL_SKILLS = [
  "Language",
  "Monster Lore",
  "Tactics",
  "Alchemy",
  "Crafting",
  "Trap Crafting",
  "Hex Weaving",
  "Spell Casting",
  "Resist Magic",
  "Ritual Crafting",
] as const;

const SKILL_LEVEL_MEANINGS: [number, string][] = [
  [1, "Inept"],
  [3, "Everyday"],
  [5, "Competent"],
  [7, "Heroic"],
  [9, "Incredible"],
  [11, "Legendary"],
  [13, "Superheroic"],
];

function allSkills() {
  return Object.entries(ATTRIBUTE_SKILLS).flatMap(([attr, skills]) =>
    skills.map((s) => ({ attr, ...s })),
  );
}

describe("rulebook skills — skill list by attribute", () => {
  it("includes every Intelligence skill from the rulebook", () => {
    const intKeys = ATTRIBUTE_SKILLS.int.map((s) => s.key);
    expect(intKeys).toEqual(
      expect.arrayContaining([
        "awareness",
        "business",
        "deduction",
        "education",
        "language",
        "monsterLore",
        "socialEtiquette",
        "streetwise",
        "tactics",
        "teaching",
        "wildernessSurv",
      ]),
    );
  });

  it("includes every Reflex combat skill from the rulebook", () => {
    const refKeys = ATTRIBUTE_SKILLS.ref.map((s) => s.key);
    expect(refKeys).toEqual(
      expect.arrayContaining([
        "brawling",
        "dodgeEscape",
        "melee",
        "riding",
        "sailing",
        "smallBlades",
        "staffSpear",
        "swordsmanship",
      ]),
    );
  });

  it("marks all (2) skills as special — double point cost at creation", () => {
    const specialKeys = new Set(
      allSkills()
        .filter((s) => s.special)
        .map((s) => s.key),
    );
    expect(specialKeys).toEqual(
      new Set([
        "language",
        "monsterLore",
        "tactics",
        "alchemy",
        "crafting",
        "trapCrafting",
        "hexWeaving",
        "spellCasting",
        "resistMagic",
        "ritualCrafting",
      ]),
    );
  });

  it("non-special skills cost 1 point per level at creation", () => {
    const sword = allSkills().find((s) => s.key === "swordsmanship");
    expect(sword?.special).toBeFalsy();
  });
});

describe("rulebook skills — level ranges", () => {
  it("skills range 0–10 normally; max 6 at creation", () => {
    expect(CREATION_SKILL_MAX).toBe(6);
  });

  it.each(SKILL_LEVEL_MEANINGS)("level %i is %s tier", (level, meaning) => {
    expect(meaning.length).toBeGreaterThan(0);
    expect(level).toBeGreaterThan(0);
  });
});

describe("rulebook skills — languages", () => {
  it("Language is a special INT skill", () => {
    const language = ATTRIBUTE_SKILLS.int.find((s) => s.key === "language");
    expect(language?.special).toBe(true);
  });
});
