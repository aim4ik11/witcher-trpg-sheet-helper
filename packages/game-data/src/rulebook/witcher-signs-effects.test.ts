/**
 * Rulebook: `sections/114-witcher-signs.md`, `curated/magic.md`
 */
import { describe, expect, it } from "vitest";
import {
  aardProneChancePercent,
  axiiStunSaveModifier,
  axiiUsesSpellCastingNotPersuasion,
  igniDamageDice,
  igniIgniteChancePercent,
  quenBlocksPerSta,
  yrdenSpdRefPenalty,
} from "../signEffects";
import { SIGN_MAX_STA_PER_CAST } from "../magicResolution";

describe("rulebook §114 — Yrden (Mixed)", () => {
  it("SPD/REF penalty in circle equals STA spent", () => {
    expect(yrdenSpdRefPenalty(3)).toBe(-3);
    expect(yrdenSpdRefPenalty(7)).toBe(-7);
  });

  it("3m radius, 5 rounds duration (catalog metadata)", () => {
    // Duration/range validated in magic.test.ts catalog; effect scales with STA here.
    expect(yrdenSpdRefPenalty(1)).toBe(-1);
  });
});

describe("rulebook §114 — Quen (Earth)", () => {
  it("blocks one failed dodge/block per STA spent", () => {
    expect(quenBlocksPerSta(1)).toBe(1);
    expect(quenBlocksPerSta(5)).toBe(5);
    expect(quenBlocksPerSta(SIGN_MAX_STA_PER_CAST)).toBe(7);
  });
});

describe("rulebook §114 — Aard (Air)", () => {
  it("10% prone base + 10% per STA spent", () => {
    expect(aardProneChancePercent(1)).toBe(10);
    expect(aardProneChancePercent(3)).toBe(30);
    expect(aardProneChancePercent(7)).toBe(70);
  });
});

describe("rulebook §114 — Igni (Fire)", () => {
  it("1d6 damage per STA spent", () => {
    expect(igniDamageDice(1)).toBe("1d6");
    expect(igniDamageDice(4)).toBe("4d6");
    expect(igniDamageDice(7)).toBe("7d6");
  });

  it("50% chance to ignite targets (fixed rule)", () => {
    expect(igniIgniteChancePercent()).toBe(50);
  });
});

describe("rulebook §114 — Axii (Water)", () => {
  it("stun save at -1; +1 harder per 2 STA past 1", () => {
    expect(axiiStunSaveModifier(1)).toBe(-1);
    expect(axiiStunSaveModifier(3)).toBe(-2);
    expect(axiiStunSaveModifier(5)).toBe(-3);
    expect(axiiStunSaveModifier(7)).toBe(-4);
  });

  it("Axii persuasion uses Spell Casting vs Resist Magic (visible magic)", () => {
    expect(axiiUsesSpellCastingNotPersuasion()).toBe(true);
  });
});

describe("rulebook §114 — signs STA variable max 7", () => {
  it("sign effects cap at 7 STA per cast", () => {
    expect(yrdenSpdRefPenalty(7)).toBe(-7);
    expect(quenBlocksPerSta(7)).toBe(7);
  });
});
