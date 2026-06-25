/**
 * Rulebook: `sections/159-critical-wounds.md`, `sections/151-combat-basics.md`
 */
import { describe, expect, it } from "vitest";
import { critWoundDamageBonus, rollCriticalWoundTable } from "../damage";
import { critWoundTierFromMargin } from "../attack";
import { createSequenceRng } from "../dice";

describe("rulebook §151 — critical wound margin tiers", () => {
  it.each([
    [6, "none"],
    [7, "simple"],
    [9, "simple"],
    [10, "complex"],
    [12, "complex"],
    [13, "difficult"],
    [14, "difficult"],
    [15, "deadly"],
  ])("beat defense by %i → %s", (margin, tier) => {
    expect(critWoundTierFromMargin(margin)).toBe(tier);
  });
});

describe("rulebook §151 — critical bonus damage by tier", () => {
  it.each([
    ["simple", 3],
    ["complex", 5],
    ["difficult", 8],
    ["deadly", 10],
  ] as const)("tier %s adds +%i before resist/location", (tier, bonus) => {
    expect(critWoundDamageBonus(tier)).toBe(bonus);
  });
});

describe("rulebook §159 — simple critical wound table (2d6)", () => {
  it("roll 12 → Cracked Jaw", () => {
    const result = rollCriticalWoundTable("simple", createSequenceRng([0.95, 0.95]));
    expect(result?.roll).toBe(12);
    expect(result?.effect).toMatch(/Cracked Jaw/i);
  });

  it("roll 11 → Disfiguring Scar", () => {
    const result = rollCriticalWoundTable("simple", createSequenceRng([0.95, 0.75]));
    expect(result?.roll).toBe(11);
    expect(result?.effect).toMatch(/Disfiguring Scar/i);
  });

  it("roll 9–10 → Cracked Ribs", () => {
    const result = rollCriticalWoundTable("simple", createSequenceRng([0.7, 0.55]));
    expect(result?.roll).toBe(9);
    expect(result?.effect).toMatch(/Cracked Ribs/i);
  });

  it("roll 6–8 → Foreign Object", () => {
    const result = rollCriticalWoundTable("simple", createSequenceRng([0.45, 0.45]));
    expect(result?.roll).toBe(6);
    expect(result?.effect).toMatch(/Foreign Object/i);
  });

  it("roll 4–5 → Sprained Arm", () => {
    const result = rollCriticalWoundTable("simple", createSequenceRng([0.25, 0.25]));
    expect(result?.roll).toBe(4);
    expect(result?.effect).toMatch(/Sprained Arm/i);
  });

  it("roll 2–3 → Sprained Leg", () => {
    const result = rollCriticalWoundTable("simple", createSequenceRng([0.05, 0.05]));
    expect(result?.roll).toBe(2);
    expect(result?.effect).toMatch(/Sprained Leg/i);
  });

  it("complex+ tiers defer to advanced tables", () => {
    expect(rollCriticalWoundTable("complex")?.effect).toMatch(/advanced table/i);
    expect(rollCriticalWoundTable("difficult")?.effect).toMatch(/advanced table/i);
    expect(rollCriticalWoundTable("deadly")?.effect).toMatch(/advanced table/i);
  });

  it("no critical wound roll when attack did not crit", () => {
    expect(rollCriticalWoundTable("none")).toBeNull();
  });
});
