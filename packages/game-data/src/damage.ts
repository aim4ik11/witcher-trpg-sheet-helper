import type {
  Character,
  CombatAttackResult,
  CombatAttackWeapon,
  CritWoundTier,
  HitLocation,
  Wound,
} from "@wilmak/shared";
import { type DiceRng, defaultRng, rollDie, rollDiceExpression } from "./dice";

export const LOCATION_MULTIPLIERS: Record<HitLocation, number> = {
  head: 3,
  torso: 1,
  rArm: 0.5,
  lArm: 0.5,
  rLeg: 0.5,
  lLeg: 0.5,
  special: 0.5,
};

const HUMANOID_LOCATION_TABLE: { roll: number[]; location: HitLocation }[] = [
  { roll: [1], location: "head" },
  { roll: [2, 3, 4], location: "torso" },
  { roll: [5], location: "rArm" },
  { roll: [6], location: "lArm" },
  { roll: [7, 8], location: "rLeg" },
  { roll: [9, 10], location: "lLeg" },
];

const MONSTER_LOCATION_TABLE: { roll: number[]; location: HitLocation }[] = [
  { roll: [1], location: "head" },
  { roll: [2, 3, 4], location: "torso" },
  { roll: [5, 6, 7], location: "rArm" },
  { roll: [8, 9], location: "lLeg" },
  { roll: [10], location: "special" },
];

const SIMPLE_CRIT_WOUNDS: { min: number; effect: string }[] = [
  { min: 12, effect: "Cracked Jaw — −2 Magical Skills & Verbal Combat" },
  { min: 11, effect: "Disfiguring Scar — −3 empathic Verbal Combat" },
  { min: 9, effect: "Cracked Ribs — −2 BODY" },
  { min: 6, effect: "Foreign Object — Recovery & Critical Healing quartered" },
  { min: 4, effect: "Sprained Arm — −2 to actions with that arm" },
  { min: 2, effect: "Sprained Leg — −2 SPD, Dodge/Escape, Athletics" },
];

export function critWoundDamageBonus(tier: CritWoundTier): number {
  switch (tier) {
    case "simple":
      return 3;
    case "complex":
      return 5;
    case "difficult":
      return 8;
    case "deadly":
      return 10;
    default:
      return 0;
  }
}

export function isMonsterTarget(character: Character): boolean {
  return character.type === "enemy" && character.enemyKind === "monster";
}

export function rollHitLocation(
  character: Character,
  aimedLocation?: HitLocation,
  rng: DiceRng = defaultRng,
): { location: HitLocation; roll: number } {
  if (aimedLocation) {
    return { location: aimedLocation, roll: 0 };
  }
  const roll = rollDie(10, rng);
  const table = isMonsterTarget(character) ? MONSTER_LOCATION_TABLE : HUMANOID_LOCATION_TABLE;
  const entry = table.find((row) => row.roll.includes(roll));
  return { location: entry?.location ?? "torso", roll };
}

export function parseDamageType(typeStr?: string): ("piercing" | "slashing" | "bludgeoning")[] {
  if (!typeStr) return ["slashing"];
  const t = typeStr.toUpperCase();
  const types: ("piercing" | "slashing" | "bludgeoning")[] = [];
  if (t.includes("P")) types.push("piercing");
  if (t.includes("S")) types.push("slashing");
  if (t.includes("B")) types.push("bludgeoning");
  return types.length > 0 ? types : ["slashing"];
}

export function armorSlotForLocation(location: HitLocation): string {
  switch (location) {
    case "head":
      return "head";
    case "torso":
      return "torso";
    case "rArm":
      return "rArm";
    case "lArm":
      return "lArm";
    case "rLeg":
      return "rLeg";
    case "lLeg":
      return "lLeg";
    default:
      return "torso";
  }
}

export function getEffectiveArmorSp(character: Character, location: HitLocation): number {
  const slot = armorSlotForLocation(location);
  const piece = character.armor?.find((a) => a.slot === slot);
  if (piece && piece.sp > 0) return piece.sp;
  if (isMonsterTarget(character) && character.monsterProfile?.naturalArmor) {
    return character.monsterProfile.naturalArmor;
  }
  return 0;
}

export function isSilverWeapon(weapon: CombatAttackWeapon): boolean {
  return /silver/i.test(weapon.name) || /silver/i.test(weapon.damageType ?? "");
}

export function applySilverSteelRule(
  damage: number,
  target: Character,
  weapon: CombatAttackWeapon,
): number {
  if (!isMonsterTarget(target)) return damage;
  if (isSilverWeapon(weapon)) return damage;
  return Math.floor(damage / 2);
}

export function rollCriticalWoundTable(
  tier: CritWoundTier,
  rng: DiceRng = defaultRng,
): { roll: number; effect: string } | null {
  if (tier === "none") return null;
  if (tier !== "simple") {
    return {
      roll: 0,
      effect: `${tier.charAt(0).toUpperCase() + tier.slice(1)} critical wound — roll on advanced table`,
    };
  }
  const roll = rollDie(6, rng) + rollDie(6, rng);
  const entry = SIMPLE_CRIT_WOUNDS.find((row) => roll >= row.min);
  return { roll, effect: entry?.effect ?? "Critical wound" };
}

export interface ResolveDamageOptions {
  target: Character;
  weapon: CombatAttackWeapon;
  attackType: CombatAttackResult["attackType"];
  critWoundTier: CritWoundTier;
  aimedLocation?: HitLocation;
  strongStrikeMultiplier?: number;
  rng?: DiceRng;
}

export function resolveDamageFromHit(
  options: ResolveDamageOptions,
): Pick<
  CombatAttackResult,
  | "hitLocation"
  | "locationRoll"
  | "locationMultiplier"
  | "damageExpression"
  | "damageRolls"
  | "damageDiceSum"
  | "damageModifier"
  | "rawDamage"
  | "strongStrikeMultiplier"
  | "damageAfterResistance"
  | "damageAfterArmor"
  | "critWoundDamageBonus"
  | "finalDamage"
  | "armorSlot"
  | "armorSpBefore"
  | "armorSpAfter"
  | "armorAblation"
  | "criticalWoundRoll"
  | "criticalWoundEffect"
> {
  const {
    target,
    weapon,
    critWoundTier,
    aimedLocation,
    strongStrikeMultiplier = 1,
    rng = defaultRng,
  } = options;

  const { location, roll: locationRoll } = rollHitLocation(target, aimedLocation, rng);
  const locationMultiplier = LOCATION_MULTIPLIERS[location];
  const expression = weapon.dmg ?? "1d6";
  const damageRoll = rollDiceExpression(expression, rng);
  const critBonus = critWoundDamageBonus(critWoundTier);
  const rawDamage = damageRoll.total * strongStrikeMultiplier + critBonus;

  let afterResistance = applySilverSteelRule(rawDamage, target, weapon);

  const slot = armorSlotForLocation(location);
  const spBefore = getEffectiveArmorSp(target, location);
  const afterArmor = Math.max(0, afterResistance - spBefore);
  const ablation = afterArmor > 0 && spBefore > 0 ? 1 : 0;

  const finalDamage = Math.floor(afterArmor * locationMultiplier);

  const critTable = rollCriticalWoundTable(critWoundTier, rng);

  return {
    hitLocation: location,
    locationRoll: locationRoll || undefined,
    locationMultiplier,
    damageExpression: expression,
    damageRolls: damageRoll.rolls,
    damageDiceSum: damageRoll.diceSum,
    damageModifier: damageRoll.modifier,
    rawDamage,
    strongStrikeMultiplier,
    damageAfterResistance: afterResistance,
    damageAfterArmor: afterArmor,
    critWoundDamageBonus: critBonus,
    finalDamage,
    armorSlot: slot,
    armorSpBefore: spBefore,
    armorSpAfter: Math.max(0, spBefore - ablation),
    armorAblation: ablation,
    criticalWoundRoll: critTable?.roll,
    criticalWoundEffect: critTable?.effect,
  };
}

export function applyDamageToCharacter(
  character: Character,
  result: CombatAttackResult,
): Character {
  if (!result.hit || result.finalDamage === undefined) return character;

  const updated: Character = {
    ...character,
    vitals: {
      ...character.vitals,
      hp: { ...character.vitals.hp },
    },
    armor: character.armor?.map((piece) => ({ ...piece })),
    wounds: [...(character.wounds ?? [])],
  };

  const damage = result.finalDamage;
  updated.vitals.hp.current = Math.max(0, updated.vitals.hp.current - damage);

  if (result.armorAblation && result.armorSlot && updated.armor) {
    const idx = updated.armor.findIndex((p) => p.slot === result.armorSlot);
    if (idx >= 0) {
      const piece = updated.armor[idx]!;
      updated.armor[idx] = {
        ...piece,
        sp: Math.max(0, piece.sp - result.armorAblation),
        damage: piece.damage + result.armorAblation,
      };
    }
  }

  if (result.criticalWoundEffect && result.critWoundTier !== "none") {
    const wound: Wound = {
      id: crypto.randomUUID(),
      description: result.criticalWoundEffect,
      severity: result.critWoundTier,
      days: 0,
    };
    updated.wounds = [...(updated.wounds ?? []), wound];
  }

  return updated;
}

export function applyDamageWithSnapshot(
  character: Character,
  result: CombatAttackResult,
): { character: Character; result: CombatAttackResult } {
  if (!result.hit || result.finalDamage === undefined) {
    return { character, result };
  }
  const hpBefore = character.vitals.hp.current;
  const updated = applyDamageToCharacter(character, result);
  return {
    character: updated,
    result: {
      ...result,
      hpBefore,
      hpAfter: updated.vitals.hp.current,
      damageApplied: true,
    },
  };
}

export function enrichAttackWithDamage(
  attack: CombatAttackResult,
  options: ResolveDamageOptions,
): CombatAttackResult {
  if (!attack.hit) return attack;
  const damage = resolveDamageFromHit(options);
  return {
    ...attack,
    ...damage,
    critWoundTier: options.critWoundTier,
  };
}

/** Step-by-step damage lines for the attack modal / log. */
export function formatDamageBreakdown(result: CombatAttackResult): string[] {
  if (!result.hit || result.rawDamage === undefined) return [];

  const lines: string[] = [];
  const diceTotal =
    (result.damageDiceSum ?? result.damageRolls?.reduce((sum, r) => sum + r, 0) ?? 0) +
    (result.damageModifier ?? 0);
  const modPart =
    result.damageModifier && result.damageModifier !== 0
      ? result.damageModifier > 0
        ? ` + ${result.damageModifier}`
        : ` − ${Math.abs(result.damageModifier)}`
      : "";
  const critPart = result.critWoundDamageBonus
    ? ` + ${result.critWoundDamageBonus} critical`
    : "";
  lines.push(
    `Damage roll ${result.damageExpression}: [${result.damageRolls?.join("+") ?? "?"}]${modPart}${critPart} = ${result.rawDamage}`,
  );

  if (result.strongStrikeMultiplier && result.strongStrikeMultiplier > 1) {
    lines.push(
      `Strong strike ×${result.strongStrikeMultiplier} on dice → ${diceTotal * result.strongStrikeMultiplier}`,
    );
  }

  if (
    result.damageAfterResistance !== undefined &&
    result.damageAfterResistance !== result.rawDamage
  ) {
    lines.push(`After silver/steel or resist → ${result.damageAfterResistance}`);
  }

  if (result.armorSpBefore !== undefined && result.armorSpBefore > 0) {
    lines.push(
      `Armor ${result.armorSlot} SP ${result.armorSpBefore}${result.armorAblation ? ` (−${result.armorAblation} ablation)` : ""} → ${result.damageAfterArmor} penetrates`,
    );
  } else if (result.damageAfterArmor !== undefined) {
    lines.push(`No armor → ${result.damageAfterArmor} before location`);
  }

  if (result.locationMultiplier !== undefined && result.hitLocation) {
    const locLabel = result.locationRoll
      ? `${result.hitLocation} (rolled ${result.locationRoll})`
      : result.hitLocation;
    lines.push(
      `Location ${locLabel} ×${result.locationMultiplier} → ${Math.floor((result.damageAfterArmor ?? 0) * result.locationMultiplier)}`,
    );
  }

  if (result.critWoundDamageBonus) {
    lines.push(`Final damage → ${result.finalDamage}`);
  } else if (result.finalDamage !== undefined) {
    lines.push(`Final damage → ${result.finalDamage}`);
  }

  return lines;
}
