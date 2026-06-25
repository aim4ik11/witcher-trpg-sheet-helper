/**
 * Rulebook: `sections/151-combat-basics.md` (Criticals and Fumbles), `curated/statistics.md`
 */
import { describe, expect, it } from "vitest";
import {
  createSequenceRng,
  parseManualDieRolls,
  resolveManualSkillCheck,
  rollD10OpenEnded,
  rollInitiative,
  rollSkillCheck,
  rollUnder,
} from "../dice";
import { resolveInitiative } from "../combat";

describe("rulebook §151 — open-ended critical on d10", () => {
  it("natural 10 then 7 → die sum 17 added to base", () => {
    const result = resolveManualSkillCheck({ base: 10, dieRolls: [10, 7] });
    expect(result.outcome).toBe("critical");
    expect(result.dieTotal).toBe(17);
    expect(result.total).toBe(27);
  });

  it("chains while rolling 10", () => {
    const open = rollD10OpenEnded(createSequenceRng([0.95, 0.95, 0.25]));
    expect(open.outcome).toBe("critical");
    expect(open.rolls).toEqual([10, 10, 3]);
    expect(open.dieTotal).toBe(23);
  });
});

describe("rulebook §151 — open-ended fumble on d10", () => {
  it("REF 7 + Swordsmanship 6, open 1 then 7 → effective base 6, total 6", () => {
    const result = resolveManualSkillCheck({
      base: 7 + 6,
      dieRolls: [1, 7],
    });
    expect(result.outcome).toBe("fumble");
    expect(result.fumblePenalty).toBe(7);
    expect(result.effectiveBase).toBe(6);
    expect(result.total).toBe(6);
  });

  it("fumble 1 then 10 then 4 subtracts 14 from base, floors at 0", () => {
    const result = resolveManualSkillCheck({
      base: 13,
      dieRolls: [1, 10, 4],
    });
    expect(result.outcome).toBe("fumble");
    expect(result.effectiveBase).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe("rulebook §151 — initiative uses plain d10 (no crit/fumble chains)", () => {
  it("initiative = REF + single d10", () => {
    expect(resolveInitiative(8, 4).initiative).toBe(12);
  });

  it("simulated initiative roll is one die only", () => {
    expect(rollInitiative(5, createSequenceRng([0.5]))).toBe(5 + 6);
  });
});

describe("rulebook dice utilities", () => {
  it("parses manual roll input for table play", () => {
    expect(parseManualDieRolls("7")).toEqual([7]);
    expect(parseManualDieRolls("10,7")).toEqual([10, 7]);
    expect(parseManualDieRolls("1, 7")).toEqual([1, 7]);
    expect(parseManualDieRolls("11")).toBeNull();
  });

  it("roll-under check succeeds when die ≤ target", () => {
    expect(rollUnder(5, createSequenceRng([0.4])).success).toBe(true);
    expect(rollUnder(3, createSequenceRng([0.9])).success).toBe(false);
  });

  it("normal skill check adds die to base", () => {
    const check = rollSkillCheck({ base: 12, rng: createSequenceRng([0.25]) });
    expect(check.total).toBe(12 + 3);
    expect(check.outcome).toBe("normal");
  });
});
