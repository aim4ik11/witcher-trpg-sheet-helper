import { ATTRIBUTES, ATTRIBUTE_SKILLS, POINT_BUY_OPTIONS } from "./characterData";
import {
  getProfession,
  resolveProfessionSkillLabel,
  parseDefiningSkill,
} from "./professions";
import { coreAbilityId } from "./skillTrees";
import { normalizeOccupation } from "./gameOptions";

export const PROFESSION_PACKAGE_POINTS = 44;
export const CREATION_SKILL_MAX = 6;

export interface CharacterCreationMeta {
  /** True once the one-time stat/skill setup is finished. */
  complete: boolean;
  pointBuy: number;
  level: number;
}

export { POINT_BUY_OPTIONS };

const STAT_KEYS = Object.keys(ATTRIBUTES);

export function defaultAttributes(): Record<string, number> {
  return Object.fromEntries(STAT_KEYS.map((k) => [k, 1]));
}

export function pickupSkillBudget(attributes: Record<string, number>): number {
  return (attributes.int ?? 0) + (attributes.ref ?? 0);
}

export function attributePointsSpent(attributes: Record<string, number>): number {
  return STAT_KEYS.reduce((sum, k) => sum + (attributes[k] ?? 0), 0);
}

export function validateCreationAttributes(
  attributes: Record<string, number>,
  pointBuy: number,
): string | null {
  for (const key of STAT_KEYS) {
    const v = attributes[key] ?? 0;
    if (v < 1) return `${ATTRIBUTES[key]?.label ?? key} must be at least 1`;
    if (v > 10) return `${ATTRIBUTES[key]?.label ?? key} cannot exceed 10 at creation`;
  }
  const total = attributePointsSpent(attributes);
  if (total !== pointBuy) {
    return `Assign exactly ${pointBuy} stat points (currently ${total})`;
  }
  return null;
}

export interface PackageSkillRef {
  attrKey: string;
  skillKey: string;
  label: string;
  special?: boolean;
  isDefining?: boolean;
}

export function professionPackageRefs(occupation: string): PackageSkillRef[] {
  const profession = getProfession(occupation);
  if (!profession) return [];

  const defining = parseDefiningSkill(profession.definingSkill);
  const occ = normalizeOccupation(occupation);
  const refs: PackageSkillRef[] = [
    {
      attrKey: defining.attrKey,
      skillKey: "__defining__",
      label: defining.name,
      isDefining: true,
    },
  ];

  for (const label of profession.skills) {
    if (label.startsWith("+")) continue;
    const resolved = resolveProfessionSkillLabel(label);
    if (resolved) {
      refs.push({ ...resolved, isDefining: false });
    }
  }
  return refs;
}

function packageSkillLevel(
  skills: Record<string, Record<string, { level: number }>>,
  professionTree: Record<string, number> | undefined,
  occupation: string,
  ref: PackageSkillRef,
): number {
  if (ref.isDefining) {
    const core = professionTree?.[coreAbilityId(occupation)];
    return core ?? 0;
  }
  return skills[ref.attrKey]?.[ref.skillKey]?.level ?? 0;
}

export function professionPackagePointsUsed(
  occupation: string,
  skills: Record<string, Record<string, { level: number }>>,
  professionTree?: Record<string, number>,
): number {
  return professionPackageRefs(occupation).reduce((sum, ref) => {
    const lvl = packageSkillLevel(skills, professionTree, occupation, ref);
    const cost = ref.special ? lvl * 2 : lvl;
    return sum + cost;
  }, 0);
}

export function validateProfessionPackage(
  occupation: string,
  skills: Record<string, Record<string, { level: number }>>,
  professionTree?: Record<string, number>,
): string | null {
  if (!occupation) return "Select an occupation";
  const refs = professionPackageRefs(occupation);
  if (refs.length === 0) return null;

  for (const ref of refs) {
    const lvl = packageSkillLevel(skills, professionTree, occupation, ref);
    if (lvl < 1) return `${ref.label} must be at least 1 in the profession package`;
    if (lvl > CREATION_SKILL_MAX) {
      return `${ref.label} cannot exceed ${CREATION_SKILL_MAX} at creation`;
    }
  }

  const used = professionPackagePointsUsed(occupation, skills, professionTree);
  if (used !== PROFESSION_PACKAGE_POINTS) {
    return `Profession package must use ${PROFESSION_PACKAGE_POINTS} points (currently ${used})`;
  }
  return null;
}

export function isProfessionPackageSkill(
  occupation: string,
  attrKey: string,
  skillKey: string,
): boolean {
  return professionPackageRefs(occupation).some(
    (r) => !r.isDefining && r.attrKey === attrKey && r.skillKey === skillKey,
  );
}

export function pickupSkillPointsUsed(
  occupation: string,
  skills: Record<string, Record<string, { level: number }>>,
): number {
  let used = 0;
  for (const [attrKey, skillMap] of Object.entries(skills)) {
    for (const [skillKey, entry] of Object.entries(skillMap)) {
      if (isProfessionPackageSkill(occupation, attrKey, skillKey)) continue;
      const special = ATTRIBUTE_SKILLS[attrKey]?.find((s) => s.key === skillKey)?.special;
      const lvl = entry?.level ?? 0;
      used += special ? lvl * 2 : lvl;
    }
  }
  return used;
}

export function validatePickupSkills(
  occupation: string,
  attributes: Record<string, number>,
  skills: Record<string, Record<string, { level: number }>>,
): string | null {
  const budget = pickupSkillBudget(attributes);
  const used = pickupSkillPointsUsed(occupation, skills);
  if (used > budget) {
    return `Pickup skills exceed INT + REF budget (${used}/${budget})`;
  }
  for (const [attrKey, skillMap] of Object.entries(skills)) {
    for (const [skillKey, entry] of Object.entries(skillMap)) {
      if (isProfessionPackageSkill(occupation, attrKey, skillKey)) continue;
      const lvl = entry?.level ?? 0;
      if (lvl > CREATION_SKILL_MAX) {
        return `Pickup skills cannot exceed ${CREATION_SKILL_MAX} at creation`;
      }
    }
  }
  return null;
}

export function validateCharacterCreation(input: {
  race: string;
  occupation: string;
  attributes: Record<string, number>;
  skills: Record<string, Record<string, { level: number }>>;
  professionTree?: Record<string, number>;
  creation: CharacterCreationMeta;
}): string | null {
  if (!input.race) return "Select a race";
  if (!input.occupation) return "Select an occupation";
  return (
    validateCreationAttributes(input.attributes, input.creation.pointBuy) ??
    validateProfessionPackage(input.occupation, input.skills, input.professionTree) ??
    validatePickupSkills(input.occupation, input.attributes, input.skills)
  );
}
