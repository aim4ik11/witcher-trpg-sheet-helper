/**
 * Witcher TRPG magic resolution — rulebook §166 (`sections/166-magic-resolution.md`).
 *
 * Covers vigor threshold, overexertion HP cost, and magic fumble outcomes by element.
 */

export type MagicElement = "mixed" | "earth" | "air" | "fire" | "water";

export type MagicFumbleTier = "minor" | "elemental" | "catastrophic";

export interface MagicFumbleEffect {
  tier: MagicFumbleTier;
  element: MagicElement;
  /** Second d10 after the opening natural 1 — drives damage and tier. */
  fumbleMargin: number;
  spellSucceeds: boolean;
  /** 1 HP per point fumbled by (the second-roll value in all tiers). */
  selfDamage: number;
  stunned: boolean;
  knockedBackMeters: number;
  onFire: boolean;
  frozen: boolean;
  /** Catastrophic tier: focusing item explodes (1d10, 2 m radius). */
  focusExplodes: boolean;
  /** Mixed element: GM picks one elemental rider at random. */
  requiresRandomElementalRider: boolean;
  /** Resolved elemental rider when mixed fumble is rolled. */
  resolvedRider?: MagicElement;
}

const ELEMENTAL_RIDERS: Record<Exclude<MagicElement, "mixed">, Omit<
  MagicFumbleEffect,
  "tier" | "element" | "fumbleMargin" | "spellSucceeds" | "selfDamage" | "focusExplodes" | "requiresRandomElementalRider"
>> = {
  earth: { stunned: true, knockedBackMeters: 0, onFire: false, frozen: false },
  air: { stunned: false, knockedBackMeters: 2, onFire: false, frozen: false },
  fire: { stunned: false, knockedBackMeters: 0, onFire: true, frozen: false },
  water: { stunned: false, knockedBackMeters: 0, onFire: false, frozen: true },
};

/** Profession vigor is the base safe STA cost per cast before overexertion. */
export function vigorThresholdFromProfession(vigor: number): number {
  return Math.max(0, vigor);
}

/** STA cost at or below threshold is safe; no HP sacrifice required. */
export function isWithinVigorThreshold(staCost: number, vigorThreshold: number): boolean {
  return staCost <= vigorThreshold;
}

/** Overexertion: 5 HP per STA point above vigor threshold (§166). */
export function overexertionHpCost(staCost: number, vigorThreshold: number): number {
  const excess = Math.max(0, staCost - vigorThreshold);
  return excess * 5;
}

/** Dimeritium within 5 m lowers vigor threshold by 1 per unit (§166). */
export function dimeritiumVigorPenalty(dimeritiumUnitsWithin5m: number): number {
  return Math.max(0, dimeritiumUnitsWithin5m);
}

export function effectiveVigorThreshold(
  baseThreshold: number,
  dimeritiumUnitsWithin5m = 0,
  touchingDimeritium = false,
): number {
  if (touchingDimeritium) return 0;
  return Math.max(0, baseThreshold - dimeritiumVigorPenalty(dimeritiumUnitsWithin5m));
}

/** Magical attack base = WILL + Spell Casting (§166). */
export function magicAttackBase(will: number, spellCastingLevel: number): number {
  return will + spellCastingLevel;
}

/** Priests always use mixed elemental effects when overdrawn or on fumble (§166). */
export function fumbleElementForCaster(
  spellElement: MagicElement,
  occupation: string,
): MagicElement {
  const occ = occupation.trim().toLowerCase();
  if (occ === "priest") return "mixed";
  return spellElement;
}

/** Tier from the second d10 after a natural 1 on a magical attack roll. */
export function magicFumbleTier(secondRoll: number): MagicFumbleTier {
  if (!Number.isInteger(secondRoll) || secondRoll < 1 || secondRoll > 10) {
    throw new RangeError("magicFumbleTier: secondRoll must be 1–10");
  }
  if (secondRoll <= 6) return "minor";
  if (secondRoll <= 9) return "elemental";
  return "catastrophic";
}

function applyElementalRider(
  element: MagicElement,
): Pick<
  MagicFumbleEffect,
  "stunned" | "knockedBackMeters" | "onFire" | "frozen" | "requiresRandomElementalRider"
> {
  if (element === "mixed") {
    return {
      stunned: false,
      knockedBackMeters: 0,
      onFire: false,
      frozen: false,
      requiresRandomElementalRider: true,
    };
  }
  return { ...ELEMENTAL_RIDERS[element], requiresRandomElementalRider: false };
}

/**
 * Resolve a magic fumble after rolling natural 1 then a second d10 (§166).
 * `fumbleMargin` is the second-roll value (1 HP damage per point in all cases).
 */
export function resolveMagicFumble(options: {
  secondRoll: number;
  element: MagicElement;
  occupation?: string;
}): MagicFumbleEffect {
  const secondRoll = options.secondRoll;
  const element = fumbleElementForCaster(options.element, options.occupation ?? "");
  const tier = magicFumbleTier(secondRoll);
  const selfDamage = secondRoll;
  const rider = applyElementalRider(element);

  if (tier === "minor") {
    return {
      tier,
      element,
      fumbleMargin: secondRoll,
      spellSucceeds: true,
      selfDamage,
      stunned: false,
      knockedBackMeters: 0,
      onFire: false,
      frozen: false,
      focusExplodes: false,
      requiresRandomElementalRider: false,
    };
  }

  if (tier === "elemental") {
    return {
      tier,
      element,
      fumbleMargin: secondRoll,
      spellSucceeds: false,
      selfDamage,
      focusExplodes: false,
      ...rider,
    };
  }

  return {
    tier,
    element,
    fumbleMargin: secondRoll,
    spellSucceeds: false,
    selfDamage,
    focusExplodes: true,
    ...rider,
  };
}

/** Magical focus lowers STA cost; never below 1 (§166). */
export function focusAdjustedStaCost(baseSta: number, focusReduction = 0): number {
  const reduced = baseSta - Math.max(0, focusReduction);
  return Math.max(1, reduced);
}

/** Signs and variable magic: STA spent per cast, max 7 (curated/magic.md). */
export const SIGN_MAX_STA_PER_CAST = 7;

export function clampSignStaSpent(staSpent: number): number {
  return Math.min(SIGN_MAX_STA_PER_CAST, Math.max(0, staSpent));
}

/** STA paid from current pool; insufficient STA causes stun (§166). */
export function applyCastingStaCost(
  currentSta: number,
  staCost: number,
): { staAfter: number; stunned: boolean } {
  if (staCost > currentSta) {
    return { staAfter: 0, stunned: true };
  }
  return { staAfter: currentSta - staCost, stunned: false };
}

/** High Spell Casting omits verbal/somatic components (§166). */
export type SpellCastingGestureLevel = 1 | 2 | 3;

export function spellCastingGestureLevel(spellCastingSkill: number): SpellCastingGestureLevel {
  if (spellCastingSkill >= 9) return 3;
  if (spellCastingSkill >= 7) return 2;
  return 1;
}

export interface DimeritiumEffect {
  roll: number;
  label: string;
  staggerEvery1d6Turns?: boolean;
  nauseated?: boolean;
  stunSaveEveryRound?: boolean;
  damagePerRound1d6?: boolean;
}

/** Endurance check vs DC 16 when touching dimeritium — apply by roll (§166). */
export function dimeritiumEffectFromEnduranceRoll(roll: number): DimeritiumEffect {
  if (roll >= 18) return { roll, label: "Itchy skin — no impairment" };
  if (roll >= 16) return { roll, label: "Itchy and mildly queasy — unimpaired" };
  if (roll >= 14) {
    return {
      roll,
      label: "Itchy, queasy, spasms — DC 15 Endurance every 1d6 turns or staggered",
      staggerEvery1d6Turns: true,
    };
  }
  if (roll >= 12) return { roll, label: "Burning skin and roiling stomach — nauseated", nauseated: true };
  if (roll >= 10) {
    return { roll, label: "Skin on fire — Stun save every round", stunSaveEveryRound: true };
  }
  return { roll, label: "Magic boils in your system — 1d6 damage per round", damagePerRound1d6: true };
}

/** Ritual fumble: 1 HP per point of Vigor spent (§166 p.168). */
export function ritualFumbleHpDamage(vigorSpent: number): number {
  return Math.max(0, vigorSpent);
}

/** Hex fumble: 50% chance the hex affects the caster (§166). */
export function hexFumbleHitsSelf(rng: () => number = Math.random): boolean {
  return rng() < 0.5;
}

export function normalizeMagicElement(value?: string | null): MagicElement {
  const v = (value ?? "").toLowerCase();
  if (v === "earth" || v === "air" || v === "fire" || v === "water" || v === "mixed") {
    return v;
  }
  return "mixed";
}
