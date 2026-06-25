/**
 * Rulebook: `curated/professions.md`, `sections/037-professions.md`
 */
import { describe, expect, it } from "vitest";
import { OCCUPATIONS, isSpellcastingOccupation } from "../gameOptions";
import { PROFESSION_PACKAGE_POINTS, professionPackageRefs } from "../characterCreation";
import { getProfession, parseDefiningSkill, PROFESSIONS } from "../professions";

const CORE_PROFESSIONS = [
  "Bard",
  "Craftsman",
  "Criminal",
  "Doctor",
  "Mage",
  "Man At Arms",
  "Merchant",
  "Priest",
  "Witcher",
] as const;

describe("rulebook professions — core book roster", () => {
  it("defines nine professions", () => {
    const values = OCCUPATIONS.map((o) => o.value).filter(Boolean);
    expect(values).toEqual(CORE_PROFESSIONS);
    expect(Object.keys(PROFESSIONS)).toEqual(CORE_PROFESSIONS);
  });

  it.each([
    ["Bard", "Busking", "emp", 0],
    ["Craftsman", "Patch Job", "cra", 0],
    ["Criminal", "Practiced Paranoia", "int", 0],
    ["Doctor", "Healing Hands", "cra", 0],
    ["Mage", "Magic Training", "int", 5],
    ["Man At Arms", "Tough As Nails", "body", 0],
    ["Merchant", "Well Traveled", "int", 0],
    ["Priest", "Initiate of the Gods", "emp", 2],
    ["Witcher", "Witcher Training", "int", 2],
  ])("%s defining skill %s (%s) with vigor %i", (key, skillName, attr, vigor) => {
    const prof = getProfession(key)!;
    const defining = parseDefiningSkill(prof.definingSkill);
    expect(defining.name).toBe(skillName);
    expect(defining.attrKey).toBe(attr);
    expect(prof.vigor).toBe(vigor);
  });
});

describe("rulebook professions — skill packages", () => {
  it("standard professions have 11 package skills including defining skill", () => {
    const standard = CORE_PROFESSIONS.filter((p) => p !== "Man At Arms");
    for (const occ of standard) {
      expect(professionPackageRefs(occ)).toHaveLength(11);
    }
  });

  it("Man At Arms has 5 fixed skills plus defining; 5 combat skills are player-chosen", () => {
    const refs = professionPackageRefs("Man At Arms");
    expect(refs).toHaveLength(6);
    expect(refs.map((r) => r.label)).toEqual([
      "Tough As Nails",
      "Wilderness Surv.",
      "Courage",
      "Physique",
      "Intimidation",
      "Dodge/Escape",
    ]);
    expect(PROFESSIONS["Man At Arms"].skills.some((s) => s.startsWith("+"))).toBe(true);
  });

  it("profession package budget is 44 points at creation", () => {
    expect(PROFESSION_PACKAGE_POINTS).toBe(44);
  });

  it("Mage and Priest are spellcasting professions", () => {
    expect(isSpellcastingOccupation("Mage")).toBe(true);
    expect(isSpellcastingOccupation("Priest")).toBe(true);
    expect(isSpellcastingOccupation("Witcher")).toBe(true);
    expect(isSpellcastingOccupation("Bard")).toBe(false);
  });

  it("Bard package includes Language as a special (2) skill", () => {
    const language = professionPackageRefs("Bard").find((r) => r.skillKey === "language");
    expect(language?.special).toBe(true);
  });

  it("Witcher package includes Spell Casting and Alchemy as special skills", () => {
    const refs = professionPackageRefs("Witcher");
    expect(refs.find((r) => r.skillKey === "spellCasting")?.special).toBe(true);
    expect(refs.find((r) => r.skillKey === "alchemy")?.special).toBe(true);
  });
});
