/**
 * Rulebook: `sections/166-magic-resolution.md` p.168 — Magic Targeting
 */
import { describe, expect, it } from "vitest";
import {
  aoeTargetResists,
  classifyMagicTargeting,
  resolveMagicTargeting,
  selfAffectingCastSuccess,
} from "../magicTargeting";

describe("rulebook §168 — classify targeting mode", () => {
  it("Self range → self-affecting", () => {
    expect(classifyMagicTargeting({ range: "Self", effect: "Shield" })).toBe("self");
    expect(classifyMagicTargeting({ range: "self", effect: "Quen shield" })).toBe("self");
  });

  it("Cone / radius / area keywords → AoE", () => {
    expect(classifyMagicTargeting({ range: "2m Cone", effect: "Fire wave" })).toBe("aoe");
    expect(classifyMagicTargeting({ range: "3m Radius", effect: "Magic trap" })).toBe("aoe");
    expect(classifyMagicTargeting({ range: "10m diameter", effect: "Barrier" })).toBe("aoe");
  });

  it("Single-target ranged → direct", () => {
    expect(classifyMagicTargeting({ range: "8m", effect: "Stun opponent", defense: "Resist Magic" })).toBe(
      "direct",
    );
    expect(classifyMagicTargeting({ range: "20m", effect: "Lightning bolt" })).toBe("direct");
  });
});

describe("rulebook §168 — targeting resolution rules", () => {
  it("direct spells act like ranged attacks — opposed defense", () => {
    const res = resolveMagicTargeting({
      range: "8m",
      defense: "Resist Magic",
      effect: "Stun",
    });
    expect(res.mode).toBe("direct");
    expect(res.requiresOpposedDefense).toBe(true);
    expect(res.areaDefenseVsCastRoll).toBe(false);
  });

  it("AoE: everyone in area defends vs Spell Casting roll", () => {
    const res = resolveMagicTargeting({ range: "2m Cone", effect: "Igni" });
    expect(res.mode).toBe("aoe");
    expect(res.areaDefenseVsCastRoll).toBe(true);
    expect(res.requiresOpposedDefense).toBe(false);
  });

  it("self-affecting: no opposed roll — beat casting DC only", () => {
    const res = resolveMagicTargeting({ range: "Self", effect: "Quen" });
    expect(res.mode).toBe("self");
    expect(res.requiresOpposedDefense).toBe(false);
    expect(selfAffectingCastSuccess(18, 15)).toBe(true);
    expect(selfAffectingCastSuccess(14, 15)).toBe(false);
  });

  it("AoE target succeeds defense when defense total beats cast total", () => {
    expect(aoeTargetResists(22, 25)).toBe(true);
    expect(aoeTargetResists(25, 22)).toBe(false);
  });
});
