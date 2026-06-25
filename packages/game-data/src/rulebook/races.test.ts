/**
 * Rulebook: `curated/character-creation.md`, `sections/021-races.md`
 */
import { describe, expect, it } from "vitest";
import { RACES } from "../gameOptions";
import {
  isOccupationAllowed,
  normalizeCharacter,
  normalizeRace,
  occupationsForRace,
  reconcileOccupation,
} from "../normalizeCharacter";

describe("rulebook creation — playable races", () => {
  it("lists exactly four playable races: Human, Elf, Dwarf, Witcher", () => {
    const playable = RACES.filter((r) => r.value).map((r) => r.value);
    expect(playable).toEqual(["Human", "Elf", "Dwarf", "Witcher"]);
  });

  it("maps legacy Halfling and Gnome saves to Human", () => {
    expect(normalizeRace("Halfling")).toBe("Human");
    expect(normalizeRace("Gnome")).toBe("Human");
  });
});

describe("rulebook creation — race and profession restrictions", () => {
  it("only Human or Elf may be Mage or Priest", () => {
    expect(isOccupationAllowed("Human", "Mage")).toBe(true);
    expect(isOccupationAllowed("Elf", "Priest")).toBe(true);
    expect(isOccupationAllowed("Dwarf", "Mage")).toBe(false);
    expect(isOccupationAllowed("Dwarf", "Priest")).toBe(false);
    expect(isOccupationAllowed("Witcher", "Mage")).toBe(false);
  });

  it("Witcher race requires Witcher profession", () => {
    const witcherOccs = occupationsForRace("Witcher").map((o) => o.value).filter(Boolean);
    expect(witcherOccs).toEqual(["Witcher"]);
    expect(isOccupationAllowed("Witcher", "Bard")).toBe(false);
    expect(isOccupationAllowed("Human", "Witcher")).toBe(false);
  });

  it("non-Witcher races cannot keep Witcher occupation on normalize", () => {
    const char = normalizeCharacter({
      type: "player",
      name: "Bad combo",
      race: "Human",
      occupation: "Witcher",
      attributes: { int: 5, ref: 5, dex: 5, body: 5, spd: 5, emp: 5, cra: 5, will: 5, luck: 1 },
      skills: {},
      vitals: { hp: { current: 25, max: 25 }, sta: { current: 25, max: 25 }, woundThreshold: 5 },
    });
    expect(char.occupation).toBe("");
  });

  it("Witcher race defaults to Witcher profession when none selected", () => {
    expect(reconcileOccupation("Witcher", "")).toBe("Witcher");
  });

  it("Human may take any non-Witcher profession", () => {
    for (const occ of ["Bard", "Craftsman", "Criminal", "Doctor", "Man At Arms", "Merchant"]) {
      expect(isOccupationAllowed("Human", occ)).toBe(true);
    }
  });
});
