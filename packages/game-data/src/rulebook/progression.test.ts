/**
 * Rulebook: `sections/059-leveling-up.md`, `sections/061-skill-trees.md`
 */
import { describe, expect, it } from "vitest";
import {
  maxSkillLevel,
  maxStatLevel,
  skillRaiseCost,
  skillRaiseTotalCost,
  statRaiseCost,
  statRaiseTotalCost,
  validatePlayerProgression,
} from "../progression";

const baseCharacter = {
  id: "p1",
  type: "player",
  name: "Test",
  race: "Human",
  occupation: "Bard",
  creation: { complete: true },
  attributes: {
    int: 5,
    ref: 5,
    dex: 5,
    body: 5,
    spd: 5,
    emp: 5,
    cra: 5,
    will: 5,
    luck: 1,
  },
  skills: { ref: { swordsmanship: { level: 4 } } },
  improvementPoints: { ip: 20, trainingIp: 100 },
};

describe("rulebook §059 — skill improvement costs", () => {
  it("raising from 4→5 costs 4 I.P.; 4→7 costs 4+5+6=15", () => {
    expect(skillRaiseCost(4, false)).toBe(4);
    expect(skillRaiseTotalCost(4, 7, false)).toBe(15);
  });

  it("gaining a new skill costs 1 I.P. (0→1)", () => {
    expect(skillRaiseCost(0, false)).toBe(1);
  });

  it("difficult (2) skills cost double per level", () => {
    expect(skillRaiseCost(4, true)).toBe(8);
    expect(skillRaiseTotalCost(4, 5, true)).toBe(8);
    expect(skillRaiseCost(0, true)).toBe(2);
  });

  it("post-creation skill cap is 10", () => {
    expect(maxSkillLevel(false)).toBe(10);
    expect(maxSkillLevel(true)).toBe(6);
  });
});

describe("rulebook §059 — raising statistics", () => {
  it("cost to raise a stat is current level × 10", () => {
    expect(statRaiseCost(4)).toBe(40);
    expect(statRaiseTotalCost(4, 5)).toBe(40);
  });

  it("stats cannot exceed 10 after creation", () => {
    expect(maxStatLevel()).toBe(10);
  });
});

describe("rulebook §059 — player progression validation", () => {
  it("allows spending 4 IP to raise Swordsmanship 4→5", () => {
    const proposed = {
      ...baseCharacter,
      skills: { ref: { swordsmanship: { level: 5 } } },
      improvementPoints: { ip: 16, trainingIp: 100 },
    };
    const result = validatePlayerProgression(baseCharacter, proposed);
    expect(result.ok).toBe(true);
  });

  it("rejects spending more IP than available", () => {
    const proposed = {
      ...baseCharacter,
      skills: { ref: { swordsmanship: { level: 7 } } },
      improvementPoints: { ip: 0, trainingIp: 100 },
    };
    const result = validatePlayerProgression(baseCharacter, proposed);
    expect(result.ok).toBe(false);
  });

  it("rejects lowering skills or stats", () => {
    const proposed = {
      ...baseCharacter,
      skills: { ref: { swordsmanship: { level: 3 } } },
    };
    expect(validatePlayerProgression(baseCharacter, proposed).ok).toBe(false);
  });

  it("rejects players editing race, occupation, or gear", () => {
    const proposed = { ...baseCharacter, race: "Elf" };
    expect(validatePlayerProgression(baseCharacter, proposed).ok).toBe(false);
  });
});
