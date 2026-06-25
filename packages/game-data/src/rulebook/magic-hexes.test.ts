/**
 * Rulebook: `sections/166-magic-resolution.md` p.168, `sections/120-hexes.md`
 */
import { describe, expect, it } from "vitest";
import { evaluateSkillCheck } from "../skillCheck";
import { resolveHexCast } from "../hexResolution";

describe("rulebook §168 — hex cast outcomes", () => {
  it("failure does nothing — no backfire, target unaffected", () => {
    const check = evaluateSkillCheck({ base: 10, modifier: 0, dc: 20, dieRolls: [3] });
    const result = resolveHexCast({ hexWeavingCheck: check, dc: 20 });
    expect(result.hexApplied).toBe(false);
    expect(result.targetAffected).toBe(false);
    expect(result.casterAffected).toBe(false);
    expect(result.backfire).toBe(false);
  });

  it("success applies hex to target", () => {
    const check = evaluateSkillCheck({ base: 15, modifier: 0, dc: 14, dieRolls: [8] });
    const result = resolveHexCast({ hexWeavingCheck: check, dc: 14 });
    expect(result.hexApplied).toBe(true);
    expect(result.targetAffected).toBe(true);
    expect(result.casterAffected).toBe(false);
  });
});

describe("rulebook §168 — hex fumble 50% self", () => {
  it("fumble + rng < 0.5 → hex affixes to caster", () => {
    const check = evaluateSkillCheck({ base: 15, modifier: 0, dieRolls: [1] });
    const result = resolveHexCast({
      hexWeavingCheck: check,
      fumbleSecondRoll: 5,
      rng: () => 0.3,
    });
    expect(result.backfire).toBe(true);
    expect(result.casterAffected).toBe(true);
    expect(result.targetAffected).toBe(false);
  });

  it("fumble + rng ≥ 0.5 → no backfire", () => {
    const check = evaluateSkillCheck({ base: 15, modifier: 0, dieRolls: [1] });
    const result = resolveHexCast({
      hexWeavingCheck: check,
      fumbleSecondRoll: 5,
      rng: () => 0.7,
    });
    expect(result.backfire).toBe(false);
    expect(result.casterAffected).toBe(false);
  });
});

describe("rulebook §120 — hex of shadows (catalog reference)", () => {
  it("low danger hex uses Hex Weaving opposed by target will", () => {
    const casterWins = evaluateSkillCheck({ base: 16, modifier: 0, dc: 12, dieRolls: [7] });
    const result = resolveHexCast({ hexWeavingCheck: casterWins, dc: 12 });
    expect(result.hexApplied).toBe(true);
  });
});
