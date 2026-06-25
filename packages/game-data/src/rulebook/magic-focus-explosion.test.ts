/**
 * Rulebook: `sections/166-magic-resolution.md` — catastrophic fumble focus explosion
 */
import { describe, expect, it } from "vitest";
import {
  focusExplosionDamageToTarget,
  resolveFocusExplosion,
} from "../focusExplosion";
import { resolveMagicFumble } from "../magicResolution";

describe("rulebook §166 — focus explosion on catastrophic fumble", () => {
  it("catastrophic fumble flags focusExplodes", () => {
    const fx = resolveMagicFumble({ secondRoll: 10, element: "fire" });
    expect(fx.focusExplodes).toBe(true);
  });

  it("focus explosion deals 1d10 damage", () => {
    const boom = resolveFocusExplosion(7);
    expect(boom.damage).toBe(7);
    expect(boom.focusDestroyed).toBe(true);
  });

  it("explosion radius is 2 meters", () => {
    expect(resolveFocusExplosion(5).radiusMeters).toBe(2);
  });

  it("targets at 0m take full damage; beyond 2m take none", () => {
    expect(focusExplosionDamageToTarget(8, 0)).toBe(8);
    expect(focusExplosionDamageToTarget(8, 1)).toBe(8);
    expect(focusExplosionDamageToTarget(8, 2)).toBe(8);
    expect(focusExplosionDamageToTarget(8, 3)).toBe(0);
  });
});

describe("rulebook §166 — focus explosion integrates with magic cast fumble", () => {
  it("when focus explodes, adjacent allies can take bomb damage", () => {
    const roll = resolveFocusExplosion(10);
    const allyDamage = focusExplosionDamageToTarget(roll.damage, 1);
    expect(allyDamage).toBe(10);
  });
});
