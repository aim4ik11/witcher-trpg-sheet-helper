/**
 * Rulebook: `sections/123-learning-magic.md`
 */
import { describe, expect, it } from "vitest";
import {
  canLearnMagic,
  learningTimeAfterFailures,
  magicLearningRequirements,
  professionCanLearnMagicType,
} from "../learningMagic";

describe("rulebook §123 — IP and time by magic level", () => {
  it.each([
    ["novice", { ip: 10, days: 4, dc: 14, checks: 2 }],
    ["journeyman", { ip: 20, days: 7, dc: 18, checks: 4 }],
    ["master", { ip: 30, days: 21, dc: 22, checks: 6 }],
    ["arch_priest", { ip: 40, days: 35, dc: 24, checks: 8 }],
  ] as const)("tier %s", (tier, expected) => {
    const req = magicLearningRequirements(tier);
    expect(req.ipRequired).toBe(expected.ip);
    expect(req.baseDays).toBe(expected.days);
    expect(req.learningDc).toBe(expected.dc);
    expect(req.learningChecksRequired).toBe(expected.checks);
  });
});

describe("rulebook §123 — vigor gate", () => {
  it("cannot learn magic without vigor > 0 at start", () => {
    expect(canLearnMagic(0)).toBe(false);
    expect(canLearnMagic(1)).toBe(true);
    expect(canLearnMagic(5)).toBe(true);
  });
});

describe("rulebook §123 — failed learning rolls add days", () => {
  it("each failure adds 1 day to learning time", () => {
    expect(learningTimeAfterFailures(4, 0)).toBe(4);
    expect(learningTimeAfterFailures(7, 2)).toBe(9);
    expect(learningTimeAfterFailures(21, 5)).toBe(26);
  });
});

describe("rulebook §123 — profession magic types", () => {
  it("Mage: spells, rituals, hexes, signs", () => {
    expect(professionCanLearnMagicType("Mage", "spell")).toBe(true);
    expect(professionCanLearnMagicType("Mage", "ritual")).toBe(true);
    expect(professionCanLearnMagicType("Mage", "hex")).toBe(true);
    expect(professionCanLearnMagicType("Mage", "sign")).toBe(true);
    expect(professionCanLearnMagicType("Mage", "invocation")).toBe(false);
  });

  it("Priest: invocations, rituals, hexes, signs", () => {
    expect(professionCanLearnMagicType("Priest", "invocation")).toBe(true);
    expect(professionCanLearnMagicType("Priest", "ritual")).toBe(true);
    expect(professionCanLearnMagicType("Priest", "hex")).toBe(true);
    expect(professionCanLearnMagicType("Priest", "sign")).toBe(true);
    expect(professionCanLearnMagicType("Priest", "spell")).toBe(false);
  });

  it("Witcher: signs only", () => {
    expect(professionCanLearnMagicType("Witcher", "sign")).toBe(true);
    expect(professionCanLearnMagicType("Witcher", "spell")).toBe(false);
    expect(professionCanLearnMagicType("Witcher", "ritual")).toBe(false);
    expect(professionCanLearnMagicType("Witcher", "hex")).toBe(false);
  });

  it("Doctor cannot learn magic", () => {
    expect(canLearnMagic(0)).toBe(false);
    expect(professionCanLearnMagicType("Doctor", "spell")).toBe(false);
  });
});
