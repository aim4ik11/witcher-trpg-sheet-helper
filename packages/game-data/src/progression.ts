import { ATTRIBUTES, ATTRIBUTE_SKILLS } from "./characterData";
import { coreAbilityId, getTreeAbility, getProfessionTree } from "./skillTrees";
import { normalizeOccupation } from "./gameOptions";

export interface ProgressionCharacter {
  occupation?: string;
  creation?: { complete: boolean };
  attributes: Record<string, number>;
  skills: Record<string, Record<string, { level: number }>>;
  professionTree?: Record<string, number>;
  definingSkillLevel?: number;
  improvementPoints?: { ip: number; trainingIp: number };
  id: string;
  type: string;
  name: string;
  race?: string;
  nickname?: string;
  enemyKind?: string;
  bestiaryId?: string;
  monsterProfile?: unknown;
  crowns?: number;
  weapons?: unknown;
  armor?: unknown;
  armorNotes?: string;
  inventory?: unknown;
  consumables?: unknown;
  spells?: unknown;
  wounds?: unknown;
  statusEffects?: unknown;
  professionAbilities?: unknown;
  luck?: { max: number; used: number };
  vitals?: unknown;
}

/** Cost to raise a skill by 1 level (0 → 1 uses gaining cost). */
export function skillRaiseCost(currentLevel: number, special?: boolean): number {
  if (currentLevel <= 0) return special ? 2 : 1;
  return special ? currentLevel * 2 : currentLevel;
}

/** Total IP to raise a skill from `from` to `to` (exclusive of `to`). */
export function skillRaiseTotalCost(
  from: number,
  to: number,
  special?: boolean,
): number {
  let cost = 0;
  for (let lvl = from; lvl < to; lvl++) {
    cost += skillRaiseCost(lvl, special);
  }
  return cost;
}

/** Training I.P. cost to raise a stat by 1 (rulebook: current level × 10). */
export function statRaiseCost(currentStat: number): number {
  return currentStat * 10;
}

export function statRaiseTotalCost(from: number, to: number): number {
  let cost = 0;
  for (let lvl = from; lvl < to; lvl++) {
    cost += statRaiseCost(lvl);
  }
  return cost;
}

export function maxSkillLevel(atCreation: boolean): number {
  return atCreation ? 6 : 10;
}

export function maxStatLevel(): number {
  return 10;
}

const PROGRESSION_KEYS = new Set([
  "attributes",
  "skills",
  "professionTree",
  "definingSkillLevel",
  "improvementPoints",
  "luck",
  "vitals",
  "movement",
  "recovery",
  "bonusMelee",
  "speed",
]);

/** Fields a player may change when spending I.P. / training points. */
export function isPlayerProgressionPatch(
  before: ProgressionCharacter,
  after: ProgressionCharacter,
): string | null {
  const locked = [
    "id",
    "type",
    "name",
    "race",
    "occupation",
    "nickname",
    "enemyKind",
    "bestiaryId",
    "monsterProfile",
    "creation",
    "crowns",
    "weapons",
    "armor",
    "armorNotes",
    "inventory",
    "consumables",
    "spells",
    "wounds",
    "statusEffects",
    "professionAbilities",
  ] as const;

  for (const key of locked) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      return `Players cannot change ${key}`;
    }
  }

  const ipBefore = before.improvementPoints?.ip ?? 0;
  const ipAfter = after.improvementPoints?.ip ?? 0;
  const trainBefore = before.improvementPoints?.trainingIp ?? 0;
  const trainAfter = after.improvementPoints?.trainingIp ?? 0;
  if (ipAfter > ipBefore || trainAfter > trainBefore) {
    return "Players cannot award themselves points";
  }

  if (!before.creation?.complete || !after.creation?.complete) {
    return "Character setup is not complete";
  }

  return null;
}

function skillSpecial(attrKey: string, skillKey: string): boolean {
  return !!ATTRIBUTE_SKILLS[attrKey]?.find((s) => s.key === skillKey)?.special;
}

function treeAbilityCost(currentLevel: number): number {
  return skillRaiseCost(currentLevel, false);
}

/** Validate and normalize a player progression update. */
export function validatePlayerProgression(
  before: ProgressionCharacter,
  proposed: ProgressionCharacter,
): { ok: true; character: ProgressionCharacter } | { ok: false; error: string } {
  const patchErr = isPlayerProgressionPatch(before, proposed);
  if (patchErr) return { ok: false, error: patchErr };

  let ipSpent = 0;
  let trainSpent = 0;

  for (const [attrKey, skills] of Object.entries(proposed.skills ?? {})) {
    for (const [skillKey, entry] of Object.entries(skills)) {
      const prev = before.skills?.[attrKey]?.[skillKey]?.level ?? 0;
      const next = entry?.level ?? 0;
      if (next < prev) return { ok: false, error: "Cannot lower skill levels" };
      if (next > maxSkillLevel(false)) {
        return { ok: false, error: `${skillKey} cannot exceed ${maxSkillLevel(false)}` };
      }
      if (next > prev) {
        ipSpent += skillRaiseTotalCost(prev, next, skillSpecial(attrKey, skillKey));
      }
    }
  }

  for (const key of Object.keys(ATTRIBUTES)) {
    const prev = before.attributes?.[key] ?? 0;
    const next = proposed.attributes?.[key] ?? 0;
    if (next < prev) return { ok: false, error: "Cannot lower stats" };
    if (next > maxStatLevel()) {
      return { ok: false, error: `${key} cannot exceed ${maxStatLevel()}` };
    }
    if (next > prev) {
      trainSpent += statRaiseTotalCost(prev, next);
    }
  }

  const occ = normalizeOccupation(before.occupation ?? "");
  const tree = occ ? getProfessionTree(occ) : undefined;
  const treeBefore = { ...(before.professionTree ?? {}) };
  if (
    before.definingSkillLevel != null &&
    treeBefore[`${occ}:core`] == null
  ) {
    treeBefore[`${occ}:core`] = before.definingSkillLevel;
  }
  const treeAfter = { ...(proposed.professionTree ?? {}) };

  for (const [abilityId, nextLevel] of Object.entries(treeAfter)) {
    const prev = treeBefore[abilityId] ?? 0;
    if (nextLevel < prev) return { ok: false, error: "Cannot lower profession abilities" };
    if (nextLevel > maxSkillLevel(false)) {
      return { ok: false, error: "Profession ability at maximum" };
    }
    if (nextLevel > prev) {
      for (let lvl = prev; lvl < nextLevel; lvl++) {
        ipSpent += treeAbilityCost(lvl);
      }
    }
  }

  const coreId = occ ? coreAbilityId(occ) : "";
  if (coreId && treeAfter[coreId] !== treeBefore[coreId]) {
    const prev = treeBefore[coreId] ?? 0;
    const next = treeAfter[coreId] ?? 0;
    if (next > prev) {
      for (let lvl = prev; lvl < next; lvl++) {
        ipSpent += treeAbilityCost(lvl);
      }
    }
  }

  const ipAvailable =
    (before.improvementPoints?.ip ?? 0) - (proposed.improvementPoints?.ip ?? 0);
  const trainAvailable =
    (before.improvementPoints?.trainingIp ?? 0) -
    (proposed.improvementPoints?.trainingIp ?? 0);

  if (ipSpent !== ipAvailable) {
    return { ok: false, error: `Skill I.P. mismatch (need ${ipSpent}, allocated ${ipAvailable})` };
  }
  if (trainSpent !== trainAvailable) {
    return {
      ok: false,
      error: `Training I.P. mismatch (need ${trainSpent}, allocated ${trainAvailable})`,
    };
  }

  const coreLevel = coreId ? (treeAfter[coreId] ?? 0) : proposed.definingSkillLevel;
  return {
    ok: true,
    character: {
      ...proposed,
      definingSkillLevel: coreLevel,
      improvementPoints: {
        ip: (before.improvementPoints?.ip ?? 0) - ipSpent,
        trainingIp: (before.improvementPoints?.trainingIp ?? 0) - trainSpent,
      },
    },
  };
}

export function spendSkillLevel(
  character: ProgressionCharacter,
  attrKey: string,
  skillKey: string,
): { ok: true; character: ProgressionCharacter } | { ok: false; error: string } {
  const current = character.skills?.[attrKey]?.[skillKey]?.level ?? 0;
  const max = maxSkillLevel(false);
  if (current >= max) return { ok: false, error: "Already at maximum" };
  const cost = skillRaiseCost(current, skillSpecial(attrKey, skillKey));
  const ip = character.improvementPoints?.ip ?? 0;
  if (ip < cost) return { ok: false, error: `Need ${cost} I.P.` };

  const skills = { ...(character.skills ?? {}) };
  skills[attrKey] = { ...skills[attrKey], [skillKey]: { level: current + 1 } };

  return validatePlayerProgression(character, {
    ...character,
    skills,
    improvementPoints: {
      ip: ip - cost,
      trainingIp: character.improvementPoints?.trainingIp ?? 0,
    },
  });
}

export function spendStatLevel(
  character: ProgressionCharacter,
  attrKey: string,
): { ok: true; character: ProgressionCharacter } | { ok: false; error: string } {
  const current = character.attributes?.[attrKey] ?? 0;
  if (current >= maxStatLevel()) return { ok: false, error: "Already at maximum" };
  const cost = statRaiseCost(current);
  const train = character.improvementPoints?.trainingIp ?? 0;
  if (train < cost) return { ok: false, error: `Need ${cost} training I.P.` };

  return validatePlayerProgression(character, {
    ...character,
    attributes: { ...character.attributes, [attrKey]: current + 1 },
    improvementPoints: {
      ip: character.improvementPoints?.ip ?? 0,
      trainingIp: train - cost,
    },
  });
}

export function spendTreeLevel(
  character: ProgressionCharacter,
  abilityId: string,
): { ok: true; character: ProgressionCharacter } | { ok: false; error: string } {
  const occ = normalizeOccupation(character.occupation ?? "");
  const tree = getProfessionTree(occ);
  if (!tree || !getTreeAbility(tree, abilityId)) {
    return { ok: false, error: "Unknown ability" };
  }

  const levels = { ...(character.professionTree ?? {}) };
  const current = levels[abilityId] ?? 0;
  if (current >= maxSkillLevel(false)) return { ok: false, error: "Already at maximum" };
  const cost = treeAbilityCost(current);
  const ip = character.improvementPoints?.ip ?? 0;
  if (ip < cost) return { ok: false, error: `Need ${cost} I.P.` };

  levels[abilityId] = current + 1;
  return validatePlayerProgression(character, {
    ...character,
    professionTree: levels,
    improvementPoints: {
      ip: ip - cost,
      trainingIp: character.improvementPoints?.trainingIp ?? 0,
    },
  });
}
