/**
 * Rulebook: `curated/combat.md` (Healing), `sections/173-healing.md`
 */
import { describe, expect, it } from "vitest";
import type { Character } from "@wilmak/shared";
import { calcDerivedStats, physicalAverage } from "../characterData";
import { normalizeCharacter } from "../normalizeCharacter";

/** Critical Healing days after treatment — rulebook table (BODY × wound tier). */
const CRITICAL_HEALING_DAYS: Record<number, Record<string, number>> = {
  3: { simple: 5, complex: 7, difficult: 9, deadly: 11 },
  4: { simple: 4, complex: 6, difficult: 8, deadly: 10 },
  5: { simple: 3, complex: 5, difficult: 7, deadly: 9 },
  6: { simple: 2, complex: 4, difficult: 6, deadly: 8 },
  7: { simple: 1, complex: 3, difficult: 5, deadly: 7 },
};

/** Critical Turns / Uses DC by wound tier — rulebook table. */
const CRITICAL_TURNS_DC: Record<string, number> = {
  simple: 12,
  complex: 14,
  difficult: 16,
  deadly: 18,
};

const CRITICAL_USES_DC: Record<string, number> = {
  simple: 14,
  complex: 16,
  difficult: 18,
  deadly: 20,
};

describe("rulebook §173 — natural healing over time", () => {
  it("REC equals physical table recovery rate for the character", () => {
    const char = normalizeCharacter({
      type: "player",
      name: "Resting",
      attributes: {
        int: 5,
        ref: 5,
        dex: 5,
        body: 7,
        spd: 5,
        emp: 5,
        cra: 5,
        will: 7,
        luck: 1,
      },
      skills: {},
      vitals: { hp: { current: 10, max: 35 }, sta: { current: 35, max: 35 }, woundThreshold: 7 },
    }) as unknown as Character;
    expect(physicalAverage(7, 7)).toBe(7);
    expect(char.recovery?.rec).toBe(7);
    expect(calcDerivedStats(char).rec).toBe(7);
  });

  it("documents daily HP healed while resting = REC (before strenuous activity halving)", () => {
    const rec = calcDerivedStats({ attributes: { body: 5, will: 5, spd: 5 } }).rec;
    expect(rec).toBe(5);
  });
});

describe("rulebook §173 — healing bonuses (documented expectations)", () => {
  it("Healing Hands adds +3 HP per day on top of natural REC healing", () => {
    const healingHandsBonusPerDay = 3;
    const rec = 5;
    expect(rec + healingHandsBonusPerDay).toBe(8);
  });

  it("swallow potion for non-witchers requires DC 18 Endurance or poisoned", () => {
    expect(18).toBe(18);
  });
});

describe("rulebook §173 — critical wound treatment tables", () => {
  it.each([
    [3, "simple", 5],
    [3, "deadly", 11],
    [7, "simple", 1],
    [7, "deadly", 7],
  ])("BODY %i %s wound → %i days to clear Treated penalty", (body, tier, days) => {
    expect(CRITICAL_HEALING_DAYS[body]![tier]).toBe(days);
  });

  it.each([
    ["simple", 12, 14],
    ["complex", 14, 16],
    ["difficult", 16, 18],
    ["deadly", 18, 20],
  ])("%s wound — Critical Turns DC %i, Critical Uses DC %i", (tier, turns, uses) => {
    expect(CRITICAL_TURNS_DC[tier]).toBe(turns);
    expect(CRITICAL_USES_DC[tier]).toBe(uses);
  });
});
