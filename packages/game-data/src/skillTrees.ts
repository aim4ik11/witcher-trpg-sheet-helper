import { ATTRIBUTES } from "./characterData";
import { normalizeOccupation } from "./gameOptions";
import trees from "./data/skill-trees.json";

/** Points required in a parent ability before the next tier becomes visible. */
export const TREE_UNLOCK_AT = 5;

/** Inline description length before we show a “read more” modal instead. */
export const TREE_DESC_INLINE_MAX = 140;

export interface TreeAbility {
  name: string;
  stat: string;
  description: string;
}

export interface TreePath {
  label: string;
  tiers: TreeAbility[];
}

export interface ProfessionTree {
  core: TreeAbility;
  paths: TreePath[];
}

const SKILL_TREES = trees as unknown as Record<string, ProfessionTree>;

export function getProfessionTree(occupation: string): ProfessionTree | undefined {
  const key = normalizeOccupation(occupation);
  return key ? SKILL_TREES[key] : undefined;
}

export function coreAbilityId(occupation: string): string {
  return `${normalizeOccupation(occupation)}:core`;
}

export function pathAbilityId(
  occupation: string,
  pathIndex: number,
  tier: 1 | 2 | 3,
): string {
  return `${normalizeOccupation(occupation)}:${pathIndex}:t${tier}`;
}

export function getParentAbilityId(abilityId: string): string | null {
  if (abilityId.endsWith(":core")) return null;
  const match = abilityId.match(/^(.+):(\d):t(\d)$/);
  if (!match) return null;
  const [, prof, path, tier] = match;
  const t = Number(tier);
  if (t === 1) return `${prof}:core`;
  return `${prof}:${path}:t${t - 1}`;
}

export function getTreeAbility(
  tree: ProfessionTree,
  abilityId: string,
): TreeAbility | undefined {
  if (abilityId.endsWith(":core")) return tree.core;
  const match = abilityId.match(/^(.+):(\d):t(\d)$/);
  if (!match) return undefined;
  const pathIndex = Number(match[2]);
  const tier = Number(match[3]) as 1 | 2 | 3;
  return tree.paths[pathIndex]?.tiers[tier - 1];
}

export function getTreeLevels(character: {
  occupation?: string;
  professionTree?: Record<string, number>;
  definingSkillLevel?: number;
}): Record<string, number> {
  const levels = { ...(character.professionTree ?? {}) };
  const occ = normalizeOccupation(character.occupation ?? "");
  if (!occ) return levels;
  const coreId = coreAbilityId(occ);
  if (levels[coreId] == null && character.definingSkillLevel != null) {
    levels[coreId] = character.definingSkillLevel;
  }
  return levels;
}

export function getTreeLevel(
  character: Parameters<typeof getTreeLevels>[0],
  abilityId: string,
): number {
  return getTreeLevels(character)[abilityId] ?? 0;
}

export function isAbilityVisible(
  character: Parameters<typeof getTreeLevels>[0],
  tree: ProfessionTree,
  abilityId: string,
): boolean {
  if (abilityId.endsWith(":core")) return true;
  const levels = getTreeLevels(character);
  if ((levels[abilityId] ?? 0) > 0) return true;
  const parentId = getParentAbilityId(abilityId);
  if (!parentId) return false;
  if (!isAbilityVisible(character, tree, parentId)) return false;
  return (levels[parentId] ?? 0) >= TREE_UNLOCK_AT;
}

export function abilityBase(
  character: { attributes?: Record<string, number> },
  ability: TreeAbility,
  level: number,
): number {
  const attr = character.attributes?.[ability.stat] ?? 0;
  return attr + level;
}

export function abilityStatShort(stat: string): string {
  return ATTRIBUTES[stat]?.short ?? stat.toUpperCase();
}

export interface VisibleTreeNode {
  id: string;
  ability: TreeAbility;
  pathIndex?: number;
  tier?: 1 | 2 | 3;
  level: number;
  base: number;
  isCore?: boolean;
}

export function buildVisibleTree(
  character: {
    occupation?: string;
    attributes?: Record<string, number>;
    professionTree?: Record<string, number>;
    definingSkillLevel?: number;
  },
  tree: ProfessionTree,
  occupation: string,
): {
  core: VisibleTreeNode;
  paths: Array<{
    label: string;
    pathIndex: number;
    tiers: VisibleTreeNode[];
  }>;
} {
  const occ = normalizeOccupation(occupation);
  const levels = getTreeLevels(character);
  const coreId = coreAbilityId(occ);
  const coreLevel = levels[coreId] ?? 0;

  const core: VisibleTreeNode = {
    id: coreId,
    ability: tree.core,
    level: coreLevel,
    base: abilityBase(character, tree.core, coreLevel),
    isCore: true,
  };

  const paths = tree.paths.map((path, pathIndex) => {
    const tiers: VisibleTreeNode[] = [];
    for (const tier of [1, 2, 3] as const) {
      const id = pathAbilityId(occ, pathIndex, tier);
      if (!isAbilityVisible(character, tree, id)) continue;
      const ability = path.tiers[tier - 1];
      if (!ability) continue;
      const level = levels[id] ?? 0;
      tiers.push({
        id,
        ability,
        pathIndex,
        tier,
        level,
        base: abilityBase(character, ability, level),
      });
    }
    return { label: path.label, pathIndex, tiers };
  });

  return { core, paths };
}
