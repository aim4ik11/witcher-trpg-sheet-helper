/**
 * Rulebook: `curated/magic.md`, `sections/114-witcher-signs.md`
 */
import { describe, expect, it } from "vitest";
import { getMagicSections, isSpellcastingOccupation, spellsForCategory } from "../gameOptions";
import { getProfession } from "../professions";
import { getMagicForCategory, MAGIC_CATALOG } from "../catalog";

describe("rulebook magic — vigor by profession", () => {
  it.each([
    ["Mage", 5],
    ["Priest", 2],
    ["Witcher", 2],
    ["Bard", 0],
    ["Doctor", 0],
  ])("%s has vigor %i", (occ, vigor) => {
    expect(getProfession(occ)?.vigor).toBe(vigor);
  });
});

describe("rulebook magic — magic types by profession", () => {
  it("Mage uses spells, rituals, and hexes", () => {
    const sections = getMagicSections("Mage").map((s) => s.key);
    expect(sections).toEqual(expect.arrayContaining(["spell", "ritual", "hex"]));
    expect(sections).not.toContain("sign");
    expect(sections).not.toContain("invocation");
  });

  it("Priest uses invocations, rituals, and hexes", () => {
    const sections = getMagicSections("Priest").map((s) => s.key);
    expect(sections).toEqual(expect.arrayContaining(["invocation", "ritual", "hex"]));
    expect(sections).not.toContain("spell");
    expect(sections).not.toContain("sign");
  });

  it("Witcher uses signs and hexes", () => {
    const sections = getMagicSections("Witcher").map((s) => s.key);
    expect(sections).toEqual(expect.arrayContaining(["sign", "hex"]));
    expect(sections).not.toContain("spell");
  });

  it("non-casters have no magic sections", () => {
    expect(getMagicSections("Bard")).toHaveLength(0);
    expect(getMagicSections("Man At Arms")).toHaveLength(0);
  });

  it("spellcasting flag matches magic-using professions", () => {
    expect(isSpellcastingOccupation("Mage")).toBe(true);
    expect(isSpellcastingOccupation("Priest")).toBe(true);
    expect(isSpellcastingOccupation("Witcher")).toBe(true);
    expect(isSpellcastingOccupation("Doctor")).toBe(false);
  });
});

describe("rulebook magic — witcher signs in catalog", () => {
  const BASIC_SIGNS = ["Yrden", "Quen", "Aard", "Igni", "Axii"];

  it("includes all five basic signs", () => {
    const signs = getMagicForCategory("sign");
    for (const name of BASIC_SIGNS) {
      expect(signs.some((s) => s.name === name), `missing sign ${name}`).toBe(true);
    }
  });

  it("basic signs use variable STA (max 7 per cast per rulebook)", () => {
    const igni = getMagicForCategory("sign").find((s) => s.name === "Igni");
    expect(igni?.staCostText).toMatch(/variable/i);
    expect(igni?.element).toBe("fire");
  });

  it("Aard defends with Dodge or Magical Shield", () => {
    const aard = getMagicForCategory("sign").find((s) => s.name === "Aard");
    expect(aard?.defense).toMatch(/Dodge/i);
    expect(aard?.range).toMatch(/2m/i);
  });

  it("Axii has 8m range and Resist Magic defense", () => {
    const axii = getMagicForCategory("sign").find((s) => s.name === "Axii");
    expect(axii?.range).toMatch(/8m/i);
    expect(axii?.defense).toMatch(/Resist Magic/i);
  });

  it("catalog has novice mage spells across elements", () => {
    const spells = getMagicForCategory("spell");
    expect(spells.some((s) => s.name === "Magic Healing")).toBe(true);
    expect(spells.some((s) => s.element === "fire")).toBe(true);
    expect(spells.some((s) => s.element === "water")).toBe(true);
  });

  it("spellsForCategory filters a character's known magic list", () => {
    const known = [
      { category: "sign", name: "Aard" },
      { category: "hex", name: "Test Hex" },
      { category: "spell", name: "Test Spell" },
    ];
    expect(spellsForCategory(known, "sign")).toHaveLength(1);
    expect(spellsForCategory(known, "spell")).toHaveLength(1);
  });

  it("magic catalog includes invocations for priests", () => {
    const invocations = getMagicForCategory("invocation");
    expect(invocations.length).toBeGreaterThan(0);
    expect(invocations.some((s) => /healing/i.test(s.name))).toBe(true);
  });

  it("sign entries are tagged for witchers", () => {
    const signs = MAGIC_CATALOG.filter((m) => m.category === "sign");
    expect(signs.every((s) => s.tags?.includes("witcher"))).toBe(true);
  });
});
