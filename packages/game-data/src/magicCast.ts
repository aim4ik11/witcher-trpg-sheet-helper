import type { Character, MagicCastResolved, Spell, StatusEffect } from "@wilmak/shared";
import { MAGIC_CATALOG } from "./catalog";
import { skillBase } from "./characterData";
import { evaluateSkillCheck, type EvaluatedSkillCheck } from "./skillCheck";
import { getProfession } from "./professions";
import {
  applyCastingStaCost,
  clampSignStaSpent,
  effectiveVigorThreshold,
  focusAdjustedStaCost,
  type MagicElement,
  type MagicFumbleEffect,
  normalizeMagicElement,
  overexertionHpCost,
  resolveMagicFumble,
  vigorThresholdFromProfession,
} from "./magicResolution";
import { type DiceRng, defaultRng, parseManualDieRolls, rollSkillCheck } from "./dice";
import { magicCastModifierFromArmor } from "./magicArmorPenalty";
import { resolveFocusExplosion } from "./focusExplosion";
import { resolveHexCast } from "./hexResolution";
import { pickMixedFumbleElementalRider } from "./mixedFumbleRider";
import { priestOverexertionBacklashElement } from "./priestMagic";
import { classifyMagicTargeting } from "./magicTargeting";

export interface MagicCastInput {
  character: Character;
  spell: Spell;
  modifier?: number;
  dc?: number;
  dieRolls?: number[];
  /** Second d10 when the cast roll is a fumble (magic fumble table). */
  fumbleSecondRoll?: number;
  /** STA actually spent (for variable signs; defaults to spell.staCost). */
  staSpent?: number;
  focusReduction?: number;
  dimeritiumUnitsWithin5m?: number;
  touchingDimeritium?: boolean;
  rng?: DiceRng;
  /** When true, apply armor EV penalty from equipped armor (TDD integration). */
  armorEvPenalty?: boolean;
  /** Second d10 for focus explosion damage when catastrophic fumble resolves. */
  focusExplosionRoll?: number;
  /** RNG for mixed fumble elemental rider selection. */
  mixedFumbleRiderRoll?: () => number;
}

export interface MagicCastResult {
  check: EvaluatedSkillCheck;
  simulated: boolean;
  element: MagicElement;
  staCost: number;
  vigorThreshold: number;
  overexertionHp: number;
  fumble: MagicFumbleEffect | null;
  spellSucceeds: boolean;
  hpBefore: number;
  hpAfter: number;
  staBefore: number;
  staAfter: number;
  stunnedFromSta: boolean;
  statusEffectsAdded: string[];
  /** Element used for overexertion backlash (priests → mixed). */
  overexertionElement?: MagicElement;
  /** Flat modifier from armor EV when armorEvPenalty is set. */
  armorEvModifier?: number;
  focusExplosionDamage?: number;
  focusExplosionRadiusMeters?: number;
  requiresStunSave?: boolean;
  hexBackfire?: boolean;
}

export function spellElement(spell: Spell): MagicElement {
  if (spell.element) return normalizeMagicElement(spell.element);
  if (spell.catalogId) {
    const entry = MAGIC_CATALOG.find((m) => m.id === spell.catalogId);
    if (entry?.element) return normalizeMagicElement(entry.element);
    const tagElement = entry?.tags?.find((t) =>
      ["earth", "air", "fire", "water", "mixed"].includes(t),
    );
    if (tagElement) return normalizeMagicElement(tagElement);
  }
  return "mixed";
}

export function casterVigorThreshold(character: Character): number {
  if (character.monsterProfile?.vigor != null) {
    return vigorThresholdFromProfession(character.monsterProfile.vigor);
  }
  const prof = getProfession(character.occupation ?? "");
  return vigorThresholdFromProfession(prof?.vigor ?? 0);
}

export function resolveStaSpent(spell: Spell, staSpent?: number): number {
  const isVariable =
    spell.staCostText?.toLowerCase().includes("variable") || spell.staCost <= 0;
  if (isVariable) {
    return clampSignStaSpent(staSpent ?? 0);
  }
  return Math.max(0, staSpent ?? spell.staCost);
}

function applyMixedFumbleRider(
  fumble: MagicFumbleEffect,
  riderRoll: () => number,
): MagicFumbleEffect {
  const rider = pickMixedFumbleElementalRider(riderRoll);
  const riderFx = resolveMagicFumble({
    secondRoll: fumble.fumbleMargin,
    element: rider,
  });
  return {
    ...fumble,
    resolvedRider: rider,
    requiresRandomElementalRider: false,
    stunned: riderFx.stunned,
    knockedBackMeters: riderFx.knockedBackMeters,
    onFire: riderFx.onFire,
    frozen: riderFx.frozen,
  };
}

export function resolveMagicCast(input: MagicCastInput): MagicCastResult {
  const { character, spell } = input;
  const baseModifier = input.modifier ?? 0;
  const applyArmorEv = input.armorEvPenalty !== false;
  const armorEvModifier = applyArmorEv ? magicCastModifierFromArmor(character) : 0;
  const modifier = baseModifier + armorEvModifier;
  const dc = input.dc;
  const base = skillBase(character, "will", "spellCasting");
  const element = spellElement(spell);
  const isHex = spell.category === "hex";
  const focusReduction = input.focusReduction ?? 0;
  const rawSta = resolveStaSpent(spell, input.staSpent);
  const staCost = focusAdjustedStaCost(rawSta, focusReduction);
  const vigorThreshold = effectiveVigorThreshold(
    casterVigorThreshold(character),
    input.dimeritiumUnitsWithin5m ?? 0,
    input.touchingDimeritium ?? false,
  );
  const overexertionHp = overexertionHpCost(staCost, vigorThreshold);
  const overexertionElement =
    overexertionHp > 0
      ? priestOverexertionBacklashElement(element, character.occupation ?? "")
      : undefined;

  let check: EvaluatedSkillCheck;
  let simulated = false;
  if (input.dieRolls && input.dieRolls.length > 0) {
    check = evaluateSkillCheck({ base, modifier, dc, dieRolls: input.dieRolls });
  } else {
    check = evaluateSkillCheck({ base, modifier, dc, rng: input.rng ?? defaultRng });
    simulated = true;
  }

  let fumble: MagicFumbleEffect | null = null;
  let hexBackfire = false;
  let hexApplied = false;

  if (isHex) {
    const hexResult = resolveHexCast({
      hexWeavingCheck: check,
      dc,
      rng: input.mixedFumbleRiderRoll ?? Math.random,
    });
    hexBackfire = hexResult.backfire;
    hexApplied = hexResult.hexApplied;
  } else if (check.outcome === "fumble") {
    const second =
      input.fumbleSecondRoll ??
      (() => {
        throw new Error("Magic fumble requires a second d10 roll");
      })();
    fumble = resolveMagicFumble({
      secondRoll: second,
      element,
      occupation: character.occupation ?? "",
    });
    if (fumble.requiresRandomElementalRider) {
      fumble = applyMixedFumbleRider(
        fumble,
        input.mixedFumbleRiderRoll ?? Math.random,
      );
    }
  }

  const hpBefore = character.vitals?.hp?.current ?? 0;
  const staBefore = character.vitals?.sta?.current ?? 0;
  const fumbleHp = fumble?.selfDamage ?? 0;
  let hpAfter = Math.max(0, hpBefore - overexertionHp - fumbleHp);
  const { staAfter, stunned: stunnedFromSta } = applyCastingStaCost(staBefore, staCost);

  let focusExplosionDamage: number | undefined;
  let focusExplosionRadiusMeters: number | undefined;
  if (fumble?.focusExplodes) {
    const boom = resolveFocusExplosion(input.focusExplosionRoll);
    focusExplosionDamage = boom.damage;
    focusExplosionRadiusMeters = boom.radiusMeters;
  }

  const statusEffectsAdded: string[] = [];
  if (stunnedFromSta) statusEffectsAdded.push("Stunned (insufficient STA)");
  if (fumble?.stunned) statusEffectsAdded.push("Stunned (magic fumble — earth)");
  if (fumble?.onFire) statusEffectsAdded.push("On fire (magic fumble)");
  if (fumble?.frozen) statusEffectsAdded.push("Frozen (magic fumble)");
  if (fumble?.knockedBackMeters) {
    statusEffectsAdded.push(`Knocked back ${fumble.knockedBackMeters}m (magic fumble)`);
  }
  if (fumble?.focusExplodes) {
    statusEffectsAdded.push(
      `Focus exploded (${focusExplosionDamage ?? "?"} dmg, ${focusExplosionRadiusMeters ?? 2}m radius)`,
    );
  }
  if (fumble?.requiresRandomElementalRider) {
    statusEffectsAdded.push("Mixed fumble — GM picks elemental rider");
  }
  if (hexBackfire) statusEffectsAdded.push("Hex backfire — affixed to caster");

  let spellSucceeds: boolean;
  if (isHex) {
    spellSucceeds = hexApplied;
  } else {
    const targeting = classifyMagicTargeting({
      range: spell.range,
      defense: spell.defense,
      category: spell.category,
    });
    const attackSucceeded =
      targeting === "self" && dc != null
        ? check.total > dc
        : dc == null
          ? true
          : check.success === true;
    spellSucceeds = attackSucceeded && (fumble == null || fumble.spellSucceeds);
  }

  return {
    check,
    simulated,
    element,
    staCost,
    vigorThreshold,
    overexertionHp,
    fumble,
    spellSucceeds,
    hpBefore,
    hpAfter,
    staBefore,
    staAfter,
    stunnedFromSta,
    statusEffectsAdded,
    overexertionElement,
    armorEvModifier: applyArmorEv ? armorEvModifier : 0,
    focusExplosionDamage,
    focusExplosionRadiusMeters,
    requiresStunSave: stunnedFromSta,
    hexBackfire,
  };
}

export function applyMagicCastToCharacter(
  character: Character,
  result: MagicCastResult,
): Character {
  const vitals = character.vitals;
  if (!vitals) return character;

  const existingEffects = character.statusEffects ?? [];
  const newEffects: StatusEffect[] = result.statusEffectsAdded.map((description) => ({
    id: crypto.randomUUID(),
    description,
  }));

  return {
    ...character,
    vitals: {
      ...vitals,
      hp: { ...vitals.hp, current: result.hpAfter },
      sta: { ...vitals.sta, current: result.staAfter },
    },
    statusEffects: [...existingEffects, ...newEffects],
  };
}

export function buildMagicCastResolved(options: {
  requestId: string;
  character: Character;
  spell: Spell;
  modifier: number;
  dc?: number;
  result: MagicCastResult;
  fumbleSecondRoll?: number;
}): MagicCastResolved {
  const { character, spell, result } = options;
  const rolls = result.check.rolls;
  return {
    requestId: options.requestId,
    characterId: character.id,
    characterName: character.name,
    spellId: spell.id,
    spellName: spell.name,
    spellCategory: spell.category,
    element: result.element,
    base: skillBase(character, "will", "spellCasting"),
    modifier: options.modifier + (result.armorEvModifier ?? 0),
    dc: options.dc,
    dieRolls: rolls,
    fumbleSecondRoll: options.fumbleSecondRoll,
    outcome: result.check.outcome,
    effectiveBase: result.check.effectiveBase,
    fumblePenalty: result.check.fumblePenalty,
    total: result.check.total,
    success: result.check.success,
    simulated: result.simulated,
    staCost: result.staCost,
    vigorThreshold: result.vigorThreshold,
    overexertionHp: result.overexertionHp,
    fumble: result.fumble ?? undefined,
    spellSucceeds: result.spellSucceeds,
    hpBefore: result.hpBefore,
    hpAfter: result.hpAfter,
    staBefore: result.staBefore,
    staAfter: result.staAfter,
    stunnedFromSta: result.stunnedFromSta,
    statusEffectsAdded: result.statusEffectsAdded,
    resolvedAt: Date.now(),
  };
}

export function formatMagicCastRolls(rolls: number[]): string {
  return rolls.join("+");
}

export function parseMagicCastRolls(input: string): number[] | null {
  return parseManualDieRolls(input);
}
