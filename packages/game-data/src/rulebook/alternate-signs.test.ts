/**
 * Rulebook: `sections/114-witcher-signs.md` p.115 — Alternate signs
 */
import { describe, expect, it } from "vitest";
import {
  activeShieldHpPerSta,
  activeShieldMaintenanceSta,
  fireStreamIgniteChancePercent,
  fireStreamMaintenanceSta,
  magicTrapDamage,
  puppetStunSavePenaltyPerTwoSta,
} from "../alternateSignEffects";

describe("rulebook §114 — Magic Trap (alternate Yrden)", () => {
  it("trap attacks with Spell Casting + WILL for 3d6 damage", () => {
    expect(magicTrapDamage({ prepared: true })).toBe("3d6");
  });

  it("requires 1 round to prepare", () => {
    expect(magicTrapDamage({ prepared: false })).toBeNull();
  });
});

describe("rulebook §114 — Active Shield (alternate Quen)", () => {
  it("10 HP per STA spent", () => {
    expect(activeShieldHpPerSta(3)).toBe(30);
    expect(activeShieldHpPerSta(7)).toBe(70);
  });

  it("maintenance each round costs half initial STA (rounded up)", () => {
    expect(activeShieldMaintenanceSta(6)).toBe(3);
    expect(activeShieldMaintenanceSta(7)).toBe(4);
  });
});

describe("rulebook §114 — Fire Stream (alternate Igni)", () => {
  it("75% ignite chance (up from 50% on basic Igni)", () => {
    expect(fireStreamIgniteChancePercent()).toBe(75);
  });

  it("maintenance costs half initial STA per round", () => {
    expect(fireStreamMaintenanceSta(8)).toBe(4);
  });
});

describe("rulebook §114 — Puppet (alternate Axii)", () => {
  it("controlled rounds equal STA spent; resist each round", () => {
    expect(puppetStunSavePenaltyPerTwoSta(1)).toBe(-1);
    expect(puppetStunSavePenaltyPerTwoSta(5)).toBe(-3);
  });
});
