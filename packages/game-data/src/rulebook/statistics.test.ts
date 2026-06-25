/**
 * Rulebook: `data/rulebook/curated/statistics.md`, `sections/047-statistics.md`
 */
import { describe, expect, it } from "vitest";
import {
  PHYSICAL_TABLE,
  HAND_TO_HAND_TABLE,
  POINT_BUY_OPTIONS,
  calcDerivedStats,
  calcVitalMaxes,
  handToHandRow,
  physicalAverage,
  skillBase,
  woundThresholdFromMaxHp,
  isBelowWoundThreshold,
} from "../characterData";

describe("rulebook statistics — point buy tiers", () => {
  it("offers Average 60, Skilled 70, Heroes 75, Legends 80", () => {
    expect(POINT_BUY_OPTIONS.map((o) => o.value)).toEqual([60, 70, 75, 80]);
  });
});

describe("rulebook statistics — physical table (BODY+WILL)/2 rounded down", () => {
  it("averages stats with floor division", () => {
    expect(physicalAverage(5, 6)).toBe(5);
    expect(physicalAverage(5, 7)).toBe(6);
    expect(physicalAverage(10, 10)).toBe(10);
  });

  it.each([
    [2, { hp: 10, sta: 10, rec: 2, stun: 20 }],
    [5, { hp: 25, sta: 25, rec: 5, stun: 50 }],
    [8, { hp: 40, sta: 40, rec: 8, stun: 80 }],
    [13, { hp: 65, sta: 65, rec: 13, stun: 130 }],
  ] as const)("avg %i → HP/STA/REC/STUN per table", (avg, row) => {
    expect(PHYSICAL_TABLE[avg]).toEqual(row);
  });

  it("BODY 5 + WILL 5 → 25 HP and STA", () => {
    const { hpStaMax, woundThreshold } = calcVitalMaxes({
      attributes: { body: 5, will: 5 },
    });
    expect(hpStaMax).toBe(25);
    expect(woundThreshold).toBe(5);
  });
});

describe("rulebook statistics — wound threshold (p.156)", () => {
  it.each([
    [15, 3],
    [20, 4],
    [25, 5],
    [40, 8],
    [50, 10],
  ])("max HP %i → threshold %i", (maxHp, threshold) => {
    expect(woundThresholdFromMaxHp(maxHp)).toBe(threshold);
  });

  it("below threshold when current HP is under the value", () => {
    expect(
      isBelowWoundThreshold({
        vitals: { hp: { current: 4 }, woundThreshold: 5 },
      }),
    ).toBe(true);
    expect(
      isBelowWoundThreshold({
        vitals: { hp: { current: 5 }, woundThreshold: 5 },
      }),
    ).toBe(false);
  });
});

describe("rulebook statistics — movement derived from SPD", () => {
  it("Run = SPD × 3 meters; Leap = Run / 5 rounded down", () => {
    const d = calcDerivedStats({ attributes: { spd: 5, body: 5, will: 5 } });
    expect(d.run).toBe(15);
    expect(d.leap).toBe(3);
  });
});

describe("rulebook statistics — hand-to-hand table by BODY", () => {
  it.each([
    [2, -4, "1d6−4", "1d6"],
    [6, 0, "1d6", "1d6+4"],
    [8, 2, "1d6+2", "1d6+6"],
    [13, 8, "1d6+8", "1d6+12"],
  ])("BODY %i → melee %+i, punch %s, kick %s", (body, bonus, punch, kick) => {
    const row = handToHandRow(body);
    expect(row.meleeBonus).toBe(bonus);
    expect(row.punch).toBe(punch);
    expect(row.kick).toBe(kick);
    expect(HAND_TO_HAND_TABLE[body < 3 ? 2 : body <= 4 ? 4 : body <= 6 ? 6 : body <= 8 ? 8 : body <= 10 ? 10 : body <= 12 ? 12 : 13]).toBeDefined();
  });
});

describe("rulebook statistics — skill check base", () => {
  it("base = stat + skill level", () => {
    const char = {
      attributes: { dex: 5 },
      skills: { dex: { athletics: { level: 3 } } },
    };
    expect(skillBase(char, "dex", "athletics")).toBe(8);
  });

  it("untrained skill uses stat only (level 0)", () => {
    const char = { attributes: { will: 10 }, skills: {} };
    expect(skillBase(char, "will", "spellCasting")).toBe(10);
  });
});
