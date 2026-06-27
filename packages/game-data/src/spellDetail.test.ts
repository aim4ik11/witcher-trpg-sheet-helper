import { describe, expect, it } from "vitest";
import type { Spell } from "@wilmak/shared";
import { getSpellDetail } from "./spellDetail";

describe("getSpellDetail", () => {
  it("merges catalog data for a known spell", () => {
    const spell: Spell = {
      id: "1",
      category: "spell",
      name: "Ivan Spell",
      staCost: 3,
      range: "",
      duration: "",
      effect: "",
      catalogId: "spell-ivan-spell",
    };
    const detail = getSpellDetail(spell);
    expect(detail.name).toBe("Ivan Spell");
    expect(detail.staDisplay).toBe("3");
    expect(detail.elementLabel).toBe("Mixed");
    expect(detail.isHomebrew).toBe(true);
    expect(detail.effect.length).toBeGreaterThan(20);
    expect(detail.stats.some((s) => s.label === "Range" && s.value !== "—")).toBe(true);
  });

  it("uses sheet values when present", () => {
    const spell: Spell = {
      id: "2",
      category: "hex",
      name: "Custom Hex",
      staCost: 4,
      staCostText: "4",
      range: "Self",
      duration: "Until dispelled",
      effect: "A custom effect.",
      defense: "Resist Magic",
    };
    const detail = getSpellDetail(spell);
    expect(detail.categoryLabel).toBe("Hexes");
    expect(detail.effect).toBe("A custom effect.");
    expect(detail.stats.find((s) => s.label === "Defense")?.value).toBe("Resist Magic");
  });
});
