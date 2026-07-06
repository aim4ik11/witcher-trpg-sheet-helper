import type {
  Character,
  CombatAttackModifier,
  CombatAttackResult,
  CombatAttackWeapon,
  CombatDefenseType,
  CombatRollBreakdown,
  HitLocation,
  Spell,
} from "@wilmak/shared";
import { skillBase } from "./characterData";
import { defenseBase, compareAttackVsDefense } from "./attack";
import { enrichAttackWithDamage } from "./damage";
import { magicCastModifierFromArmor } from "./magicArmorPenalty";
import {
  applyCastingStaCost,
  focusAdjustedStaCost,
  overexertionHpCost,
  resolveMagicFumble,
} from "./magicResolution";
import { casterVigorThreshold, resolveStaSpent, spellElement } from "./magicCast";
import {
  type DiceRng,
  type SkillCheckResult,
  defaultRng,
  rollSkillCheck,
  resolveManualSkillCheck,
} from "./dice";

function toRollBreakdown(
  result: SkillCheckResult,
  statSkillBase: number,
  modifier: number,
): CombatRollBreakdown {
  return {
    outcome: result.outcome,
    rolls: result.rolls,
    statSkillBase,
    effectiveBase: result.effectiveBase,
    base: result.effectiveBase,
    modifier,
    total: result.total,
  };
}

export interface ResolveSpellAttackOptions {
  attacker: Character;
  target: Character;
  spell: Spell;
  defenseType: Extract<CombatDefenseType, "dodge" | "reposition" | "none">;
  modifiers?: CombatAttackModifier[];
  /** Required when defenseType is "none". */
  defenseDc?: number;
  /** Manual spell casting roll — omit to simulate. */
  attackerDieRolls?: number[];
  /** Manual target defense roll — omit to simulate. */
  defenderDieRolls?: number[];
  /** Second d10 for the magic fumble table — required when casting roll is a natural 1. */
  fumbleSecondRoll?: number;
  /** Second d10 for focus explosion damage — required when fumble second roll is 10. */
  focusExplosionRoll?: number;
  /** Spell damage dice expression (e.g. "3d6"). Leave empty for non-damaging spells. */
  dmgExpression?: string;
  staSpent?: number;
  focusReduction?: number;
  aimedLocation?: HitLocation;
  round: number;
  rng?: DiceRng;
}

export interface SpellAttackOutcome {
  result: CombatAttackResult;
  updatedAttacker: Character;
}

export function spellToCombatWeapon(spell: Spell, dmgExpression?: string): CombatAttackWeapon {
  return {
    name: spell.name,
    dmg: dmgExpression || undefined,
    wa: 0,
    isRanged: true,
    isMagic: true,
    spellId: spell.id,
    spellCategory: spell.category,
    effect: spell.effect,
  };
}

export function spellAttackBase(character: Character): number {
  return skillBase(character, "will", "spellCasting");
}

export function resolveSpellAttack(options: ResolveSpellAttackOptions): SpellAttackOutcome {
  const {
    attacker,
    target,
    spell,
    defenseType,
    rng = defaultRng,
  } = options;
  const modifiers = options.modifiers ?? [];

  // Spell casting roll — includes armor EV penalty
  const armorEvMod = magicCastModifierFromArmor(attacker);
  const customModSum = modifiers.reduce((sum, m) => sum + m.value, 0);
  const totalModifier = customModSum + armorEvMod;
  const attackSkillBase = skillBase(attacker, "will", "spellCasting");

  const attackResult: SkillCheckResult =
    options.attackerDieRolls !== undefined
      ? resolveManualSkillCheck({
          base: attackSkillBase,
          modifier: totalModifier,
          dieRolls: options.attackerDieRolls,
        })
      : rollSkillCheck({ base: attackSkillBase, modifier: totalModifier, rng });

  // Magic fumble — required when natural 1
  let magicFumble: CombatAttackResult["magicFumble"] | undefined;
  if (attackResult.outcome === "fumble") {
    if (options.fumbleSecondRoll === undefined) {
      throw new Error("Magic fumble: second d10 roll is required");
    }
    const element = spellElement(spell);
    const fumbleEffect = resolveMagicFumble({
      secondRoll: options.fumbleSecondRoll,
      element,
      occupation: attacker.occupation ?? "",
    });

    let focusExplosionDamage: number | undefined;
    if (fumbleEffect.focusExplodes && options.focusExplosionRoll !== undefined) {
      focusExplosionDamage = options.focusExplosionRoll;
    } else if (fumbleEffect.focusExplodes) {
      throw new Error("Catastrophic fumble: focus explosion d10 roll is required");
    }

    magicFumble = {
      tier: fumbleEffect.tier,
      element: fumbleEffect.element,
      selfDamage: fumbleEffect.selfDamage,
      stunned: fumbleEffect.stunned,
      knockedBackMeters: fumbleEffect.knockedBackMeters,
      onFire: fumbleEffect.onFire,
      frozen: fumbleEffect.frozen,
      focusExplodes: fumbleEffect.focusExplodes,
      focusExplosionDamage,
    };
  }

  // Defense roll
  let defenseRoll: CombatRollBreakdown | undefined;
  let defenseTotal = options.defenseDc ?? 0;
  if (defenseType !== "none") {
    const defBase = defenseBase(target, defenseType);
    const defResult: SkillCheckResult =
      options.defenderDieRolls !== undefined
        ? resolveManualSkillCheck({ base: defBase, dieRolls: options.defenderDieRolls })
        : rollSkillCheck({ base: defBase, rng });
    defenseRoll = toRollBreakdown(defResult, defBase, 0);
    defenseTotal = defResult.total;
  }

  const { hit, margin } = compareAttackVsDefense(attackResult.total, defenseTotal);

  // STA cost and caster overexertion
  const staSpentNum = resolveStaSpent(spell, options.staSpent);
  const effectiveSta = focusAdjustedStaCost(staSpentNum, options.focusReduction ?? 0);
  const vigorThreshold = casterVigorThreshold(attacker);
  const overexertionHp = overexertionHpCost(effectiveSta, vigorThreshold);

  // All modifiers shown in log
  const allModifiers: CombatAttackModifier[] = [
    ...(armorEvMod !== 0 ? [{ label: "Armor EV", value: armorEvMod }] : []),
    ...modifiers,
  ];

  const weapon = spellToCombatWeapon(spell, options.dmgExpression);

  let result: CombatAttackResult = {
    id: crypto.randomUUID(),
    round: options.round,
    attackerId: attacker.id,
    attackerName: attacker.name,
    targetId: target.id,
    targetName: target.name,
    attackType: "normal",
    weapon,
    defenseType,
    modifiers: allModifiers,
    attackRoll: toRollBreakdown(attackResult, attackSkillBase, totalModifier),
    defenseRoll,
    defenseDc: defenseType === "none" ? options.defenseDc : undefined,
    hit,
    margin,
    critWoundTier: "none",
    staCost: effectiveSta,
    overexertionHp: overexertionHp > 0 ? overexertionHp : undefined,
    magicFumble,
    timestamp: new Date().toISOString(),
  };

  // Damage resolution (only when hit and a damage expression was provided)
  if (hit && options.dmgExpression) {
    result = enrichAttackWithDamage(result, {
      target,
      weapon: { ...weapon, dmg: options.dmgExpression },
      attackType: "normal",
      critWoundTier: "none",
      aimedLocation: options.aimedLocation,
      rng,
    });
  }

  // Update attacker vitals (STA cost + overexertion HP + fumble self-damage)
  const fumbleSelfDamage = magicFumble?.selfDamage ?? 0;
  const staBefore = attacker.vitals.sta.current;
  const { staAfter } = applyCastingStaCost(staBefore, effectiveSta);
  const hpBefore = attacker.vitals.hp.current;
  const hpAfter = Math.max(0, hpBefore - overexertionHp - fumbleSelfDamage);

  const updatedAttacker: Character = {
    ...attacker,
    vitals: {
      ...attacker.vitals,
      hp: { ...attacker.vitals.hp, current: hpAfter },
      sta: { ...attacker.vitals.sta, current: staAfter },
    },
  };

  return { result, updatedAttacker };
}
