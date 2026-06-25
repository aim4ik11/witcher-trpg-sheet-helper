/**
 * Rulebook: `sections/166-magic-resolution.md` (Overexertion, Magic Fumbles)
 */
import { describe, expect, it } from "vitest";
import {
  applyCastingStaCost,
  clampSignStaSpent,
  dimeritiumEffectFromEnduranceRoll,
  dimeritiumVigorPenalty,
  effectiveVigorThreshold,
  focusAdjustedStaCost,
  fumbleElementForCaster,
  hexFumbleHitsSelf,
  isWithinVigorThreshold,
  magicAttackBase,
  magicFumbleTier,
  overexertionHpCost,
  resolveMagicFumble,
  ritualFumbleHpDamage,
  SIGN_MAX_STA_PER_CAST,
  spellCastingGestureLevel,
  vigorThresholdFromProfession,
} from "../magicResolution";

describe("rulebook §166 — vigor threshold & overexertion", () => {
  it("Mage vigor 5 can cast STA ≤5 without HP cost", () => {
    const threshold = vigorThresholdFromProfession(5);
    expect(isWithinVigorThreshold(5, threshold)).toBe(true);
    expect(overexertionHpCost(5, threshold)).toBe(0);
  });

  it("casting STA 8 with vigor 5 costs (8−5)×5 = 15 HP", () => {
    expect(overexertionHpCost(8, 5)).toBe(15);
    expect(isWithinVigorThreshold(8, 5)).toBe(false);
  });

  it("Witcher signs: STA 7 with vigor 2 overexerts by 5 → 25 HP", () => {
    expect(overexertionHpCost(7, 2)).toBe(25);
  });

  it("dimeritium within 5 m reduces vigor threshold by 1 per unit", () => {
    expect(dimeritiumVigorPenalty(3)).toBe(3);
    expect(effectiveVigorThreshold(5, 2)).toBe(3);
  });

  it("touching dimeritium sets vigor threshold to 0", () => {
    expect(effectiveVigorThreshold(5, 0, true)).toBe(0);
  });
});

describe("rulebook §166 — magical attack formula", () => {
  it("WILL 10 + Spell Casting 9 = 19 base before d10", () => {
    expect(magicAttackBase(10, 9)).toBe(19);
  });
});

describe("rulebook §166 — magic fumble tiers (second d10)", () => {
  it.each([
    [1, "minor"],
    [6, "minor"],
    [7, "elemental"],
    [9, "elemental"],
    [10, "catastrophic"],
  ])("second roll %i → %s", (roll, tier) => {
    expect(magicFumbleTier(roll)).toBe(tier);
  });
});

describe("rulebook §166 — minor fumble (1–6): spell still goes off", () => {
  it("second roll 4 → 4 self-damage, spell succeeds, no elemental rider", () => {
    const fx = resolveMagicFumble({ secondRoll: 4, element: "fire" });
    expect(fx.tier).toBe("minor");
    expect(fx.spellSucceeds).toBe(true);
    expect(fx.selfDamage).toBe(4);
    expect(fx.onFire).toBe(false);
    expect(fx.focusExplodes).toBe(false);
  });
});

describe("rulebook §166 — elemental fumble (7–9): spell fails + element effect", () => {
  it("fire 8 → fail, 8 damage, set on fire", () => {
    const fx = resolveMagicFumble({ secondRoll: 8, element: "fire" });
    expect(fx.spellSucceeds).toBe(false);
    expect(fx.selfDamage).toBe(8);
    expect(fx.onFire).toBe(true);
    expect(fx.focusExplodes).toBe(false);
  });

  it("earth 7 → fail, stunned", () => {
    const fx = resolveMagicFumble({ secondRoll: 7, element: "earth" });
    expect(fx.stunned).toBe(true);
    expect(fx.knockedBackMeters).toBe(0);
  });

  it("air 9 → fail, thrown back 2 m", () => {
    const fx = resolveMagicFumble({ secondRoll: 9, element: "air" });
    expect(fx.knockedBackMeters).toBe(2);
    expect(fx.stunned).toBe(false);
  });

  it("water 8 → fail, frozen", () => {
    const fx = resolveMagicFumble({ secondRoll: 8, element: "water" });
    expect(fx.frozen).toBe(true);
  });
});

describe("rulebook §166 — catastrophic fumble (>9)", () => {
  it("fire 10 → fail, on fire, focus explodes", () => {
    const fx = resolveMagicFumble({ secondRoll: 10, element: "fire" });
    expect(fx.tier).toBe("catastrophic");
    expect(fx.spellSucceeds).toBe(false);
    expect(fx.selfDamage).toBe(10);
    expect(fx.onFire).toBe(true);
    expect(fx.focusExplodes).toBe(true);
  });
});

describe("rulebook §166 — priests always use mixed elemental fumbles", () => {
  it("priest fire fumble uses mixed element with random rider", () => {
    expect(fumbleElementForCaster("fire", "Priest")).toBe("mixed");
    const fx = resolveMagicFumble({
      secondRoll: 8,
      element: "fire",
      occupation: "Priest",
    });
    expect(fx.element).toBe("mixed");
    expect(fx.requiresRandomElementalRider).toBe(true);
    expect(fx.spellSucceeds).toBe(false);
  });

  it("mage keeps spell element on fumble", () => {
    expect(fumbleElementForCaster("water", "Mage")).toBe("water");
    const fx = resolveMagicFumble({ secondRoll: 8, element: "water", occupation: "Mage" });
    expect(fx.element).toBe("water");
    expect(fx.frozen).toBe(true);
    expect(fx.requiresRandomElementalRider).toBe(false);
  });
});

describe("rulebook §166 — mixed element fumble", () => {
  it("mixed 8 → fail, damage, GM picks random elemental rider", () => {
    const fx = resolveMagicFumble({ secondRoll: 8, element: "mixed" });
    expect(fx.requiresRandomElementalRider).toBe(true);
    expect(fx.selfDamage).toBe(8);
  });
});

describe("rulebook §166 — focus, STA exhaustion, gestures", () => {
  it("magical focus reduces STA cost but not below 1", () => {
    expect(focusAdjustedStaCost(5, 2)).toBe(3);
    expect(focusAdjustedStaCost(2, 5)).toBe(1);
  });

  it("signs cap STA spent at 7 per cast", () => {
    expect(SIGN_MAX_STA_PER_CAST).toBe(7);
    expect(clampSignStaSpent(10)).toBe(7);
  });

  it("insufficient STA stuns caster", () => {
    expect(applyCastingStaCost(3, 5)).toEqual({ staAfter: 0, stunned: true });
    expect(applyCastingStaCost(10, 5)).toEqual({ staAfter: 5, stunned: false });
  });

  it("Spell Casting 7/9 unlock gesture tiers", () => {
    expect(spellCastingGestureLevel(6)).toBe(1);
    expect(spellCastingGestureLevel(7)).toBe(2);
    expect(spellCastingGestureLevel(9)).toBe(3);
  });
});

describe("rulebook §166 — dimeritium endurance table", () => {
  it.each([
    [18, false],
    [16, false],
    [14, true],
    [12, true],
    [10, true],
    [8, true],
  ])("Endurance roll %i", (roll, hasImpairment) => {
    const fx = dimeritiumEffectFromEnduranceRoll(roll);
    const impaired =
      !!fx.staggerEvery1d6Turns ||
      !!fx.nauseated ||
      !!fx.stunSaveEveryRound ||
      !!fx.damagePerRound1d6;
    expect(impaired).toBe(hasImpairment);
  });
});

describe("rulebook §166 — ritual & hex fumble helpers", () => {
  it("ritual fumble: 1 HP per vigor spent", () => {
    expect(ritualFumbleHpDamage(6)).toBe(6);
  });

  it("hex fumble 50% self — deterministic with rng", () => {
    expect(hexFumbleHitsSelf(() => 0.3)).toBe(true);
    expect(hexFumbleHitsSelf(() => 0.7)).toBe(false);
  });
});

describe("rulebook §166 — exhaustive fumble second-roll matrix", () => {
  const elements = ["earth", "air", "fire", "water", "mixed"] as const;

  it.each([1, 2, 3, 4, 5, 6])("minor tier roll %i: spell succeeds, damage = roll", (roll) => {
    for (const element of elements) {
      const fx = resolveMagicFumble({ secondRoll: roll, element });
      expect(fx.tier).toBe("minor");
      expect(fx.spellSucceeds).toBe(true);
      expect(fx.selfDamage).toBe(roll);
      expect(fx.focusExplodes).toBe(false);
    }
  });

  it.each([7, 8, 9])("elemental tier roll %i: spell fails", (roll) => {
    const fx = resolveMagicFumble({ secondRoll: roll, element: "fire" });
    expect(fx.tier).toBe("elemental");
    expect(fx.spellSucceeds).toBe(false);
    expect(fx.selfDamage).toBe(roll);
  });

  it("catastrophic tier roll 10: focus explodes for all elements", () => {
    for (const element of elements) {
      const fx = resolveMagicFumble({ secondRoll: 10, element });
      expect(fx.tier).toBe("catastrophic");
      expect(fx.spellSucceeds).toBe(false);
      expect(fx.focusExplodes).toBe(true);
      expect(fx.selfDamage).toBe(10);
    }
  });
});

describe("rulebook §166 — dimeritium effects table (exact thresholds)", () => {
  it("≥18: itchy, no impairment", () => {
    const fx = dimeritiumEffectFromEnduranceRoll(18);
    expect(fx.staggerEvery1d6Turns).toBeFalsy();
    expect(fx.nauseated).toBeFalsy();
    expect(fx.stunSaveEveryRound).toBeFalsy();
    expect(fx.damagePerRound1d6).toBeFalsy();
  });

  it("16–17: queasy but unimpaired", () => {
    const fx = dimeritiumEffectFromEnduranceRoll(16);
    expect(fx.nauseated).toBeFalsy();
    expect(fx.stunSaveEveryRound).toBeFalsy();
  });

  it("14–15: stagger every 1d6 turns DC 15 Endurance", () => {
    const fx = dimeritiumEffectFromEnduranceRoll(14);
    expect(fx.staggerEvery1d6Turns).toBe(true);
  });

  it("12–13: nauseated", () => {
    expect(dimeritiumEffectFromEnduranceRoll(12).nauseated).toBe(true);
  });

  it("10–11: Stun save every round", () => {
    expect(dimeritiumEffectFromEnduranceRoll(10).stunSaveEveryRound).toBe(true);
    expect(dimeritiumEffectFromEnduranceRoll(11).stunSaveEveryRound).toBe(true);
  });

  it("≤9: 1d6 damage per round while touching", () => {
    expect(dimeritiumEffectFromEnduranceRoll(9).damagePerRound1d6).toBe(true);
    expect(dimeritiumEffectFromEnduranceRoll(1).damagePerRound1d6).toBe(true);
  });
});

describe("rulebook §166 — gesture requirements (full table)", () => {
  it.each([
    [1, 1],
    [6, 1],
    [7, 2],
    [8, 2],
    [9, 3],
    [10, 3],
  ])("Spell Casting %i → gesture level %i", (skill, level) => {
    expect(spellCastingGestureLevel(skill)).toBe(level);
  });
});

describe("rulebook §166 — magical attack uses WILL not REF/DEX", () => {
  it("magicAttackBase is WILL + Spell Casting only", () => {
    expect(magicAttackBase(8, 5)).toBe(13);
    expect(magicAttackBase(10, 9)).toBe(19);
  });
});
