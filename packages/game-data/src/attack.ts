import type {
  Character,
  CombatAttackModifier,
  CombatAttackResult,
  CombatAttackType,
  CombatAttackWeapon,
  CombatDefenseType,
  CombatRollBreakdown,
  CombatState,
  CritWoundTier,
  HitLocation,
  Weapon,
} from "@wilmak/shared";
import { skillBase } from "./characterData";
import { normalizeCombatState } from "./combat";
import { enrichAttackWithDamage } from "./damage";
import { getMonsterById } from "./monsters";
import {
  type DiceRng,
  defaultRng,
  parseManualDieRolls,
  resolveManualSkillCheck,
  rollSkillCheck,
  type SkillCheckResult,
} from "./dice";

export type RangeBand = "pointBlank" | "close" | "medium" | "long" | "extreme";

const RANGE_MODIFIERS: Record<RangeBand, number> = {
  pointBlank: 5,
  close: 0,
  medium: -2,
  long: -4,
  extreme: -6,
};

const AIM_LOCATION_PENALTIES: Record<string, number> = {
  head: -6,
  torso: -1,
  rArm: -3,
  lArm: -3,
  rLeg: -2,
  lLeg: -2,
};

export interface AttackTypeConfig {
  attackCount: number;
  attackModifier: number;
  damageMultiplier: number;
  costsSta: boolean;
  label: string;
  allowed: boolean;
  disallowReason?: string;
}

export interface WeaponSkillRef {
  attrKey: string;
  skillKey: string;
  isRanged: boolean;
}

export function getCurrentParticipant(combat: CombatState) {
  const state = normalizeCombatState(combat);
  if (state.participants.length === 0) return undefined;
  const index = Math.min(
    Math.max(0, state.currentTurnIndex),
    state.participants.length - 1,
  );
  return { participant: state.participants[index]!, index };
}

export function advanceTurn(combat: CombatState): CombatState {
  const state = normalizeCombatState(combat);
  if (state.participants.length === 0) return state;
  const nextIndex = (state.currentTurnIndex + 1) % state.participants.length;
  if (nextIndex === 0) {
    return {
      ...state,
      currentTurnIndex: 0,
      round: state.round + 1,
      participants: state.participants.map((p) => ({
        ...p,
        actionUsed: false,
        staSpentThisRound: 0,
        defensesThisRound: 0,
      })),
    };
  }
  return { ...state, currentTurnIndex: nextIndex };
}

export function applyAttackToCombatState(
  combat: CombatState,
  results: CombatAttackResult[],
): CombatState {
  if (results.length === 0) return combat;
  const state = appendAttackResults(combat, results);
  const first = results[0]!;
  const attackStaCost = results.reduce((sum, r) => sum + (r.staCost ?? 0), 0);

  return {
    ...state,
    participants: state.participants.map((p) => {
      if (p.characterId === first.attackerId) {
        return {
          ...p,
          actionUsed: true,
          staSpentThisRound: (p.staSpentThisRound ?? 0) + attackStaCost,
        };
      }
      if (p.characterId === first.targetId && first.defenseType !== "none") {
        const defenses = (p.defensesThisRound ?? 0) + 1;
        const extraDefSta = defenses > 1 ? 1 : 0;
        return {
          ...p,
          defensesThisRound: defenses,
          staSpentThisRound: (p.staSpentThisRound ?? 0) + extraDefSta,
        };
      }
      return p;
    }),
  };
}

export function appendAttackResults(
  combat: CombatState,
  results: CombatAttackResult[],
): CombatState {
  const state = normalizeCombatState(combat);
  return {
    ...state,
    attackLog: [...state.attackLog, ...results],
  };
}

export function critWoundTierFromMargin(margin: number): CritWoundTier {
  if (margin < 7) return "none";
  if (margin < 10) return "simple";
  if (margin < 13) return "complex";
  if (margin < 15) return "difficult";
  return "deadly";
}

export function compareAttackVsDefense(
  attackTotal: number,
  defenseTotal: number,
): { hit: boolean; margin: number } {
  const hit = attackTotal > defenseTotal;
  return { hit, margin: attackTotal - defenseTotal };
}

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

export function isRangedWeapon(weapon: {
  name: string;
  rng?: string;
  hand?: string;
}): boolean {
  const name = weapon.name.toLowerCase();
  return /bow|crossbow|javelin|throwing|sling|dart/.test(name);
}

export function isThrownWeapon(weapon: Pick<Weapon, "name">): boolean {
  return /javelin|throwing|sling|dart/i.test(weapon.name);
}

export function defenderHasShield(character: Character): boolean {
  return (character.weapons ?? []).some((w) => /shield/i.test(w.name));
}

export function inferDefenderBlockSkill(
  character: Character,
  defenseType: CombatDefenseType,
): string {
  if (defenseType === "block") {
    if (defenderHasShield(character)) return "melee";
    const weapon = character.weapons?.[0];
    if (weapon) return inferWeaponSkill(weapon).skillKey;
    return "melee";
  }
  if (defenseType === "parry") {
    const weapon = character.weapons?.[0];
    if (weapon) return inferWeaponSkill(weapon).skillKey;
    return "swordsmanship";
  }
  return "melee";
}

export function getAllowedDefenseTypes(weapon: CombatAttackWeapon): CombatDefenseType[] {
  if (!weapon.isRanged || weapon.isThrown) {
    return ["dodge", "reposition", "block", "parry", "none"];
  }
  return ["dodge", "reposition", "block", "none"];
}

export function isDefenseAllowed(
  defenseType: CombatDefenseType,
  weapon: CombatAttackWeapon,
  defender: Character,
): boolean {
  if (!getAllowedDefenseTypes(weapon).includes(defenseType)) return false;
  if (
    defenseType === "block" &&
    weapon.isRanged &&
    !weapon.isThrown &&
    !defenderHasShield(defender)
  ) {
    return false;
  }
  return true;
}

export function thrownParryModifier(weapon: CombatAttackWeapon): number {
  return weapon.isThrown ? -2 : 0;
}

export function isMonsterAttacker(character: Character): boolean {
  return character.type === "enemy" && character.enemyKind === "monster";
}

export function isEnemyAttacker(character: Character): boolean {
  return character.type === "enemy";
}

/** Bestiary ROF — attacks per action for this weapon. */
export function weaponRateOfFire(
  weapon: { rateOfFire?: number; rel?: string; name: string },
  attacker?: Character,
): number {
  if (weapon.rateOfFire && weapon.rateOfFire > 0) return weapon.rateOfFire;
  if (attacker?.bestiaryId && weapon.name) {
    const catalog = getMonsterById(attacker.bestiaryId);
    const entry = catalog?.weapons.find(
      (w) => w.name.toLowerCase() === weapon.name.toLowerCase(),
    );
    if (entry) return Math.max(1, parseInt(entry.rof, 10) || 1);
  }
  return 1;
}

export function attackOptionsForAttacker(attacker: Character): {
  showAttackTypes: boolean;
  attackTypes: CombatAttackType[];
} {
  if (attacker.type === "player") {
    return {
      showAttackTypes: true,
      attackTypes: ["normal", "fast", "strong", "extra"],
    };
  }
  return {
    showAttackTypes: false,
    attackTypes: ["normal"],
  };
}

export function attackTypeConfigForAttacker(
  attacker: Character,
  attackType: CombatAttackType,
  weapon: CombatAttackWeapon,
  sourceWeapon?: Weapon,
): AttackTypeConfig {
  if (isEnemyAttacker(attacker)) {
    const rof = sourceWeapon
      ? weaponRateOfFire(sourceWeapon, attacker)
      : (weapon.rateOfFire ?? 1);
    const allowed = attackType === "normal";
    return {
      attackCount: allowed ? rof : 0,
      attackModifier: 0,
      damageMultiplier: 1,
      costsSta: false,
      label:
        rof > 1
          ? `${weapon.name} (${rof}× ROF)`
          : weapon.name,
      allowed,
      disallowReason: !allowed
        ? isMonsterAttacker(attacker)
          ? "Monsters attack at weapon ROF only — no fast/strong/extra."
          : "NPCs use bestiary weapon attacks (ROF) — no fast/strong/extra."
        : undefined,
    };
  }
  return attackTypeConfig(attackType, weapon);
}

export function inferWeaponSkill(weapon: {
  name: string;
  rng?: string;
  hand?: string;
}): WeaponSkillRef {
  const name = weapon.name.toLowerCase();
  if (/crossbow/.test(name)) {
    return { attrKey: "dex", skillKey: "crossbow", isRanged: true };
  }
  if (/bow|longbow|shortbow/.test(name)) {
    return { attrKey: "dex", skillKey: "archery", isRanged: true };
  }
  if (/javelin|throwing|sling|dart/.test(name)) {
    return { attrKey: "dex", skillKey: "archery", isRanged: true };
  }
  if (/staff|spear|pole|halberd|pike/.test(name)) {
    return { attrKey: "ref", skillKey: "staffSpear", isRanged: false };
  }
  if (/dagger|knife|stiletto|messer/.test(name)) {
    return { attrKey: "ref", skillKey: "smallBlades", isRanged: false };
  }
  if (/axe|mace|club|hammer|flail/.test(name)) {
    return { attrKey: "ref", skillKey: "melee", isRanged: false };
  }
  if (/claw|bite|tail|horn|tusk|fist|ram|charge/i.test(name)) {
    return { attrKey: "ref", skillKey: "brawling", isRanged: false };
  }
  if (isRangedWeapon(weapon)) {
    return { attrKey: "dex", skillKey: "archery", isRanged: true };
  }
  return { attrKey: "ref", skillKey: "swordsmanship", isRanged: false };
}

export function weaponToCombatWeapon(weapon: Weapon): CombatAttackWeapon {
  const skillRef = inferWeaponSkill(weapon);
  return {
    id: weapon.id,
    name: weapon.name,
    dmg: weapon.dmg,
    damageType: weapon.type,
    wa: weapon.wa ?? 0,
    isRanged: skillRef.isRanged,
    isThrown: isThrownWeapon(weapon),
    rateOfFire: weaponRateOfFire(weapon),
    effect: weapon.effect || undefined,
  };
}

export function unarmedCombatWeapon(kind: "punch" | "kick", dmg: string): CombatAttackWeapon {
  return {
    name: kind === "punch" ? "Punch" : "Kick",
    dmg,
    wa: 0,
    isRanged: false,
    isUnarmed: true,
    unarmedKind: kind,
  };
}

export function attackBase(
  character: Character,
  weapon: CombatAttackWeapon,
  rangeBand?: RangeBand,
): number {
  if (weapon.isUnarmed) {
    return skillBase(character, "ref", "brawling");
  }
  const w =
    character.weapons?.find((item) => item.id === weapon.id) ??
    ({ name: weapon.name, rng: "", hand: "" } as Weapon);
  const skillRef = inferWeaponSkill(w);
  const statSkill = skillBase(character, skillRef.attrKey, skillRef.skillKey);
  const wa = weapon.wa ?? 0;
  const rangeMod = weapon.isRanged && rangeBand ? RANGE_MODIFIERS[rangeBand] : 0;
  return statSkill + wa + rangeMod;
}

export function defenseBase(
  character: Character,
  defenseType: CombatDefenseType,
  blockSkillKey?: string,
): number {
  switch (defenseType) {
    case "dodge":
      return skillBase(character, "dex", "dodgeEscape");
    case "reposition":
      return skillBase(character, "dex", "athletics");
    case "block":
      if (blockSkillKey) {
        const attr = blockSkillKey === "brawling" ? "ref" : "ref";
        return skillBase(character, attr, blockSkillKey);
      }
      return skillBase(character, "ref", "melee");
    case "parry":
      if (blockSkillKey) {
        return skillBase(character, "ref", blockSkillKey);
      }
      return skillBase(character, "ref", "swordsmanship");
    default:
      return 0;
  }
}

export function attackTypeConfig(
  attackType: CombatAttackType,
  weapon: CombatAttackWeapon,
): AttackTypeConfig {
  const crossbow = /crossbow/i.test(weapon.name);
  const bow = /bow/i.test(weapon.name) && !crossbow;

  switch (attackType) {
    case "normal":
      return {
        attackCount: 1,
        attackModifier: 0,
        damageMultiplier: 1,
        costsSta: false,
        label: "Normal attack",
        allowed: true,
      };
    case "fast":
      return {
        attackCount: bow ? 1 : crossbow ? 0 : 2,
        attackModifier: 0,
        damageMultiplier: 1,
        costsSta: false,
        label: "Fast strike",
        allowed: !crossbow,
        disallowReason: crossbow ? "Crossbows cannot fast strike." : undefined,
      };
    case "strong":
      return {
        attackCount: 1,
        attackModifier: -3,
        damageMultiplier: 2,
        costsSta: false,
        label: "Strong strike",
        allowed: !crossbow,
        disallowReason: crossbow ? "Crossbows cannot strong strike." : undefined,
      };
    case "extra":
      return {
        attackCount: 1,
        attackModifier: -3,
        damageMultiplier: 1,
        costsSta: true,
        label: "Extra attack",
        allowed: true,
      };
  }
}

export function defenseModifier(
  defenseType: CombatDefenseType,
  weapon?: CombatAttackWeapon,
): number {
  let mod = 0;
  if (defenseType === "parry") mod -= 3;
  if (weapon && defenseType === "parry") mod += thrownParryModifier(weapon);
  return mod;
}

export interface ResolveAttackOptions {
  attacker: Character;
  target: Character;
  weapon: CombatAttackWeapon;
  attackType: CombatAttackType;
  defenseType: CombatDefenseType;
  modifiers?: CombatAttackModifier[];
  rangeBand?: RangeBand;
  defenseDc?: number;
  blockSkillKey?: string;
  /** When set, use manual rolls for attacker; otherwise simulate. */
  attackerDieRolls?: number[];
  /** When set, use manual rolls for defender; otherwise simulate if defense is not none. */
  defenderDieRolls?: number[];
  rng?: DiceRng;
  attackIndex?: number;
}

export function resolveAttack(options: ResolveAttackOptions): CombatAttackResult {
  const {
    attacker,
    target,
    weapon,
    attackType,
    defenseType,
    modifiers = [],
    rangeBand,
    defenseDc,
    blockSkillKey,
    attackerDieRolls,
    defenderDieRolls,
    rng = defaultRng,
    attackIndex,
  } = options;

  const typeConfig = attackTypeConfigForAttacker(
    attacker,
    attackType,
    weapon,
    attacker.weapons?.find((item) => item.id === weapon.id),
  );
  const modifierSum =
    typeConfig.attackModifier + modifiers.reduce((sum, m) => sum + m.value, 0);

  const attackSkillBase = attackBase(attacker, weapon, rangeBand);
  const attackResult =
    attackerDieRolls !== undefined
      ? resolveManualSkillCheck({
          base: attackSkillBase,
          modifier: modifierSum,
          dieRolls: attackerDieRolls,
        })
      : rollSkillCheck({ base: attackSkillBase, modifier: modifierSum, rng });

  let defenseRoll: CombatRollBreakdown | undefined;
  let defenseTotal = defenseDc ?? 0;

  if (defenseType !== "none") {
    const defBase = defenseBase(target, defenseType, blockSkillKey);
    const defMod = defenseModifier(defenseType, weapon);
    const defResult =
      defenderDieRolls !== undefined
        ? resolveManualSkillCheck({
            base: defBase,
            modifier: defMod,
            dieRolls: defenderDieRolls,
          })
        : rollSkillCheck({ base: defBase, modifier: defMod, rng });
    defenseRoll = toRollBreakdown(defResult, defBase, defMod);
    defenseTotal = defResult.total;
  }

  const { hit, margin } = compareAttackVsDefense(attackResult.total, defenseTotal);

  return {
    id: crypto.randomUUID(),
    round: 0,
    attackIndex,
    attackerId: attacker.id,
    attackerName: attacker.name,
    targetId: target.id,
    targetName: target.name,
    attackType,
    weapon,
    defenseType,
    modifiers: [
      ...(typeConfig.attackModifier !== 0
        ? [{ label: typeConfig.label, value: typeConfig.attackModifier }]
        : []),
      ...modifiers,
    ],
    attackRoll: toRollBreakdown(attackResult, attackSkillBase, modifierSum),
    staCost: typeConfig.costsSta ? 1 : undefined,
    defenseRoll,
    defenseDc: defenseType === "none" ? defenseDc : undefined,
    hit,
    margin,
    critWoundTier: hit ? critWoundTierFromMargin(margin) : "none",
    timestamp: new Date().toISOString(),
  };
}

export function resolveAttackAction(
  options: Omit<ResolveAttackOptions, "attackIndex"> & {
    round: number;
    /** Per fast-strike hit: manual defender rolls (NPCs re-roll when omitted). */
    defenderDieRollsPerAttack?: (number[] | undefined)[];
  },
): CombatAttackResult[] {
  const typeConfig = attackTypeConfigForAttacker(
    options.attacker,
    options.attackType,
    options.weapon,
    options.attacker.weapons?.find((item) => item.id === options.weapon.id),
  );
  const results: CombatAttackResult[] = [];
  for (let i = 0; i < typeConfig.attackCount; i++) {
    const defenderRolls =
      options.defenderDieRollsPerAttack?.[i] ??
      (typeConfig.attackCount === 1 ? options.defenderDieRolls : undefined);
    const result = resolveAttack({
      ...options,
      defenderDieRolls: defenderRolls,
      attackIndex: typeConfig.attackCount > 1 ? i + 1 : undefined,
    });
    results.push({ ...result, round: options.round });
  }
  return results;
}

export function resolveAttackWithDamage(
  attack: CombatAttackResult,
  options: {
    target: Character;
    aimedLocation?: HitLocation;
    rng?: DiceRng;
    damageDieRolls?: number[];
  },
): CombatAttackResult {
  if (!attack.hit) return attack;
  const typeConfig = attackTypeConfig(attack.attackType, attack.weapon);
  return enrichAttackWithDamage(attack, {
    target: options.target,
    weapon: attack.weapon,
    attackType: attack.attackType,
    critWoundTier: attack.critWoundTier,
    aimedLocation: options.aimedLocation,
    strongStrikeMultiplier: typeConfig.damageMultiplier,
    rng: options.rng,
    damageDieRolls: options.damageDieRolls,
  });
}

export function resolveAttackActionWithDamage(
  options: Omit<ResolveAttackOptions, "attackIndex"> & {
    round: number;
    aimedLocation?: HitLocation;
    defenderDieRollsPerAttack?: (number[] | undefined)[];
    /** Per-attack manual damage die values. Index matches fast-strike order. */
    damageDieRollsPerAttack?: (number[] | undefined)[];
    rng?: DiceRng;
  },
): CombatAttackResult[] {
  const attacks = resolveAttackAction(options);
  return attacks.map((attack, i) =>
    resolveAttackWithDamage(attack, {
      target: options.target,
      aimedLocation: options.aimedLocation,
      rng: options.rng,
      damageDieRolls: options.damageDieRollsPerAttack?.[i],
    }),
  );
}

export function buildModifierList(flags: {
  aimLocation?: string;
  targetDodging?: boolean;
  fastDraw?: boolean;
  ambush?: boolean;
  outsideVisionCone?: boolean;
  custom?: number;
}): CombatAttackModifier[] {
  const mods: CombatAttackModifier[] = [];
  if (flags.aimLocation && AIM_LOCATION_PENALTIES[flags.aimLocation] !== undefined) {
    mods.push({
      label: `Aim: ${flags.aimLocation}`,
      value: AIM_LOCATION_PENALTIES[flags.aimLocation]!,
    });
  }
  if (flags.targetDodging) mods.push({ label: "Target dodging", value: -2 });
  if (flags.fastDraw) mods.push({ label: "Fast draw", value: -3 });
  if (flags.ambush) mods.push({ label: "Ambush", value: 5 });
  if (flags.outsideVisionCone) mods.push({ label: "Outside vision cone", value: -3 });
  if (flags.custom && flags.custom !== 0) {
    mods.push({ label: "Custom", value: flags.custom });
  }
  return mods;
}

export function formatCritWoundTier(tier: CritWoundTier): string {
  switch (tier) {
    case "none":
      return "—";
    case "simple":
      return "Simple (+3 dmg)";
    case "complex":
      return "Complex (+5 dmg)";
    case "difficult":
      return "Difficult (+8 dmg)";
    case "deadly":
      return "Deadly (+10 dmg)";
  }
}

export { parseManualDieRolls, RANGE_MODIFIERS, AIM_LOCATION_PENALTIES };
