/**
 * Rulebook: `sections/057-skill-resolution.md`, `curated/skills.md`
 */
import { describe, expect, it } from "vitest";
import { compareAttackVsDefense } from "../attack";
import { evaluateSkillCheck } from "../skillCheck";
import { resolveManualSkillCheck } from "../dice";

describe("rulebook §057 — opposing an antagonist", () => {
  it("higher total wins; equal totals favor the defender", () => {
    expect(compareAttackVsDefense(29, 19).hit).toBe(true);
    expect(compareAttackVsDefense(19, 29).hit).toBe(false);
    expect(compareAttackVsDefense(22, 22).hit).toBe(false);
  });

  it("Geralt sword attack 29 vs mercenary block 19", () => {
    const geralt = resolveManualSkillCheck({ base: 13 + 11, dieRolls: [5] });
    const merc = resolveManualSkillCheck({ base: 7 + 6, dieRolls: [6] });
    expect(geralt.total).toBe(29);
    expect(merc.total).toBe(19);
  });
});

describe("rulebook §057 — opposing a difficulty (DC)", () => {
  it("Dandelion pick lock: 13 beats DC 10", () => {
    const check = evaluateSkillCheck({
      base: 5 + 5,
      dc: 10,
      dieRolls: [3],
    });
    expect(check.total).toBe(13);
    expect(check.success).toBe(true);
  });

  it("must beat DC strictly — rolling exactly the DC fails", () => {
    const check = evaluateSkillCheck({
      base: 5,
      dc: 10,
      dieRolls: [5],
    });
    expect(check.total).toBe(10);
    expect(check.success).toBe(false);
  });

  it("fails when total is below DC", () => {
    const check = evaluateSkillCheck({
      base: 5 + 5,
      dc: 14,
      dieRolls: [3],
    });
    expect(check.total).toBe(13);
    expect(check.success).toBe(false);
  });
});

describe("rulebook §057 — opposing target stat × 3", () => {
  it("Ermion spell casting 28 vs wolf WILL×3 = 12", () => {
    const wolfWill = 4;
    const dc = wolfWill * 3;
    const check = evaluateSkillCheck({
      base: 10 + 9,
      dc,
      dieRolls: [9],
    });
    expect(dc).toBe(12);
    expect(check.total).toBe(28);
    expect(check.success).toBe(true);
  });
});

describe("rulebook §057 — example difficulty chart", () => {
  it.each([
    { task: "rotten door", dc: 10 },
    { task: "sneak past guard", dc: 14 },
    { task: "well-made lock", dc: 18 },
    { task: "throwing axe at 10m", dc: 20 },
    { task: "fortress gate barehanded", dc: 30 },
  ])("$task is DC $dc", ({ dc }) => {
    expect(dc).toBeGreaterThan(0);
    const base = dc - 5;
    const barelyFail = evaluateSkillCheck({ base, dc, dieRolls: [5] });
    const barelyPass = evaluateSkillCheck({ base, dc, dieRolls: [6] });
    expect(barelyFail.total).toBe(dc);
    expect(barelyPass.total).toBe(dc + 1);
    expect(barelyFail.success).toBe(false);
    expect(barelyPass.success).toBe(true);
  });
});
