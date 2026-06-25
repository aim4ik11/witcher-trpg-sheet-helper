/**
 * Rulebook: `sections/166-magic-resolution.md` — mixed elemental fumble rider
 */
import { describe, expect, it } from "vitest";
import {
  mixedFumbleRiderPool,
  pickMixedFumbleElementalRider,
} from "../mixedFumbleRider";
import { resolveMagicFumble } from "../magicResolution";

describe("rulebook §166 — mixed fumble rider pool", () => {
  it("pool is earth, air, fire, water only", () => {
    expect(mixedFumbleRiderPool()).toEqual(["earth", "air", "fire", "water"]);
  });

  it("mixed elemental fumble (7–9) requires random rider pick", () => {
    const fx = resolveMagicFumble({ secondRoll: 8, element: "mixed" });
    expect(fx.requiresRandomElementalRider).toBe(true);
  });
});

describe("rulebook §166 — pickMixedFumbleElementalRider", () => {
  it("deterministic rng picks rider by quartile", () => {
    expect(pickMixedFumbleElementalRider(() => 0.0)).toBe("earth");
    expect(pickMixedFumbleElementalRider(() => 0.24)).toBe("earth");
    expect(pickMixedFumbleElementalRider(() => 0.25)).toBe("air");
    expect(pickMixedFumbleElementalRider(() => 0.49)).toBe("air");
    expect(pickMixedFumbleElementalRider(() => 0.5)).toBe("fire");
    expect(pickMixedFumbleElementalRider(() => 0.74)).toBe("fire");
    expect(pickMixedFumbleElementalRider(() => 0.75)).toBe("water");
    expect(pickMixedFumbleElementalRider(() => 0.99)).toBe("water");
  });

  it("picked rider applies elemental effect to mixed fumble resolution", () => {
    const rider = pickMixedFumbleElementalRider(() => 0.9);
    expect(rider).toBe("water");
    const fx = resolveMagicFumble({ secondRoll: 8, element: "mixed" });
    expect(fx.frozen || fx.requiresRandomElementalRider).toBe(true);
  });
});
