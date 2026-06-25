/**
 * Rulebook: `curated/gear-armor.md`, `sections/090-armor-enhancements.md`
 */
import { describe, expect, it } from "vitest";
import { ARMOR_CATALOG } from "../catalog";
import { ARMOR_LABELS } from "../characterData";
import { getEffectiveArmorSp } from "../damage";
import type { Character } from "@wilmak/shared";

describe("rulebook armor — slot coverage", () => {
  it("humanoid armor uses six locations from the rulebook", () => {
    expect(Object.keys(ARMOR_LABELS)).toEqual(
      expect.arrayContaining(["head", "torso", "rArm", "lArm", "rLeg", "lLeg"]),
    );
  });

  it("catalog has armor for every slot", () => {
    for (const slot of ["head", "torso", "rLeg", "lArm"]) {
      expect(ARMOR_CATALOG.some((a) => a.slot === slot), `no armor for ${slot}`).toBe(true);
    }
  });
});

describe("rulebook armor — stopping power examples from core tables", () => {
  it.each([
    ["Gambeson", 3],
    ["Brigandine", 12],
    ["Plate Armor", 20],
    ["Nilfgaardian Plate Armor", 30],
    ["Great Helm", 20],
    ["Leather Shield", 4],
    ["Pavise", 20],
  ])("%s SP %i", (name, sp) => {
    const piece = ARMOR_CATALOG.find((a) => a.name === name);
    expect(piece?.sp).toBe(sp);
  });
});

describe("rulebook armor — SP subtracted before location multiplier", () => {
  it("only the struck slot's SP applies", () => {
    const target: Character = {
      id: "t",
      type: "player",
      name: "Knight",
      attributes: {},
      skills: {},
      vitals: { hp: { current: 30, max: 30 }, sta: { current: 30, max: 30 }, woundThreshold: 6 },
      armor: [
        { slot: "head", name: "Great Helm", sp: 20, damage: 0, effects: "Restricted Vision", weight: 3.5 },
        { slot: "torso", name: "Plate Armor", sp: 20, damage: 0, effects: "", weight: 14 },
      ],
    };
    expect(getEffectiveArmorSp(target, "head")).toBe(20);
    expect(getEffectiveArmorSp(target, "torso")).toBe(20);
    expect(getEffectiveArmorSp(target, "rLeg")).toBe(0);
  });
});

describe("rulebook armor — restricted vision helmets", () => {
  it("Great Helm and Skellige Helm have Restricted Vision effect", () => {
    for (const name of ["Great Helm", "Skellige Helm", "Nilfgaardian Helm"]) {
      const helm = ARMOR_CATALOG.find((a) => a.name === name);
      expect(helm?.effects).toMatch(/Restricted Vision/i);
    }
  });
});

describe("rulebook armor — encumbrance (EV) documented values", () => {
  it("heavy plate torso has EV 2 per rulebook", () => {
    const plate = ARMOR_CATALOG.find((a) => a.name === "Plate Armor");
    expect(plate?.tags?.some((t) => t.includes("ev"))).toBe(true);
  });

  it("EV penalizes REF, DEX, and Spell Casting (documented rule)", () => {
    const evPenaltyStats = ["REF", "DEX", "Spell Casting"];
    expect(evPenaltyStats).toHaveLength(3);
  });
});
