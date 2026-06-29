import {
  calcDerivedStats,
  calcVitalMaxes,
  getSpd,
  woundThresholdFromMaxHp,
} from "./characterData";
import {
  normalizeOccupation,
  OCCUPATIONS,
  RACES,
  type OccupationOption,
} from "./gameOptions";

const RACE_ALIASES: Record<string, string> = {
  Halfling: "Human",
  Gnome: "Human",
};

const VALID_RACES = new Set(RACES.map((r) => r.value).filter(Boolean));

const DEFAULT_ATTRIBUTES: Record<string, number> = {
  int: 1,
  ref: 1,
  dex: 1,
  body: 1,
  spd: 1,
  emp: 1,
  cra: 1,
  will: 1,
  luck: 1,
};

const LEGACY_LANGUAGE_KEYS = ["nordling", "elderSpeech", "dwarven"] as const;

export interface CharacterLike {
  race?: string;
  occupation?: string;
  enemyKind?: "npc" | "monster";
  bestiaryId?: string;
  definingSkillLevel?: number;
  professionTree?: Record<string, number>;
  professionAbilities?: { level?: number }[];
  attributes?: Record<string, number>;
  skills?: Record<string, Record<string, { level: number }>>;
  luck?: { max?: number; used?: number };
  speed?: number;
  vitals?: {
    hp?: { current?: number; max?: number };
    sta?: { current?: number; max?: number };
    woundThreshold?: number;
    /** @deprecated Verbal combat removed — stripped on normalize. */
    resolve?: { current?: number; max?: number };
  };
  movement?: { run?: number; leap?: number };
  recovery?: { stun?: number; rec?: number };
  bonusMelee?: { punch?: string; kick?: string };
  crowns?: number;
  inventory?: {
    id?: string;
    qty?: number;
    name?: string;
    category?: string;
    effect?: string;
    weight?: number;
    cost?: number;
    catalogId?: string;
    source?: string;
  }[];
  consumables?: {
    id?: string;
    qty?: number;
    name?: string;
    effect?: string;
    weight?: number;
  }[];
  /** @deprecated Optional rule removed — stripped on normalize. */
  adrenaline?: number;
}

export function normalizeRace(race?: string): string {
  if (!race) return "";
  const mapped = RACE_ALIASES[race] ?? race;
  return VALID_RACES.has(mapped) ? mapped : "";
}

export function occupationsForRace(race: string): OccupationOption[] {
  return OCCUPATIONS.filter((occ) => {
    if (!occ.value) return true;
    if (occ.witcherRaceOnly) return race === "Witcher";
    if (occ.value === "Witcher") return race === "Witcher";
    if (occ.humanOrElfOnly) return race === "Human" || race === "Elf";
    if (race === "Witcher") return occ.value === "Witcher";
    return true;
  });
}

export function isOccupationAllowed(race: string, occupation: string): boolean {
  const occ = normalizeOccupation(occupation);
  if (!occ) return true;
  return occupationsForRace(race).some((o) => o.value === occ);
}

/** Pick a valid occupation for race, preserving choice when possible. */
export function reconcileOccupation(race: string, occupation?: string): string {
  const occ = normalizeOccupation(occupation ?? "");
  if (!occ) {
    return race === "Witcher" ? "Witcher" : "";
  }
  if (isOccupationAllowed(race, occ)) return occ;
  if (race === "Witcher") return "Witcher";
  if (occ === "Witcher") return "";
  return "";
}

function migrateAttributes(char: CharacterLike): Record<string, number> {
  const raw = char.attributes ?? {};
  const attrs: Record<string, number> = { ...DEFAULT_ATTRIBUTES };

  for (const [key, val] of Object.entries(raw)) {
    if (typeof val === "number" && Number.isFinite(val)) attrs[key] = val;
  }

  if (!("spd" in raw) && (char.speed ?? 0) > 0) attrs.spd = char.speed!;
  if (!("luck" in raw) && char.luck?.max != null) {
    const legacyPlaceholder =
      char.luck.max === 5 &&
      Object.entries(raw).every(([k, v]) => k === "luck" || v === 1);
    if (!legacyPlaceholder) attrs.luck = char.luck.max;
  }

  return attrs;
}

function migrateSkills(
  skills: Record<string, Record<string, { level: number }>>,
): Record<string, Record<string, { level: number }>> {
  const out: Record<string, Record<string, { level: number }>> = {};
  for (const [attr, skillMap] of Object.entries(skills)) {
    out[attr] = { ...skillMap };
  }

  const intSkills = out.int ?? {};
  let languageLevel = intSkills.language?.level ?? 0;
  for (const key of LEGACY_LANGUAGE_KEYS) {
    const level = intSkills[key]?.level ?? 0;
    if (level > languageLevel) languageLevel = level;
    delete intSkills[key];
  }
  if (languageLevel > 0) intSkills.language = { level: languageLevel };
  if (Object.keys(intSkills).length > 0) out.int = intSkills;
  else delete out.int;

  return out;
}

function isBestiaryEnemy(char: CharacterLike): boolean {
  return !!char.bestiaryId;
}

function applyDerived(char: CharacterLike): void {
  if (isBestiaryEnemy(char)) {
    const attrs = char.attributes ?? {};
    char.speed = attrs.spd ?? char.speed ?? 0;
    char.luck = {
      max: attrs.luck ?? char.luck?.max ?? 0,
      used: char.luck?.used ?? 0,
    };
    if (char.vitals) {
      const hpMax = char.vitals.hp?.max ?? 0;
      char.vitals.woundThreshold = woundThresholdFromMaxHp(hpMax);
    }
    return;
  }

  const { hpStaMax, woundThreshold } = calcVitalMaxes(char);
  const d = calcDerivedStats(char);
  char.speed = getSpd(char);
  char.luck = { max: d.luckMax, used: char.luck?.used ?? 0 };
  char.movement = { run: d.run, leap: d.leap };
  char.recovery = { stun: d.stun, rec: d.rec };
  char.bonusMelee = { punch: d.punch, kick: d.kick };
  if (char.vitals) {
    const freshVitals =
      (char.vitals.hp?.max ?? 0) === 0 && (char.vitals.sta?.max ?? 0) === 0;
    char.vitals.hp = {
      current: freshVitals ? hpStaMax : (char.vitals.hp?.current ?? hpStaMax),
      max: hpStaMax,
    };
    char.vitals.sta = {
      current: freshVitals ? hpStaMax : (char.vitals.sta?.current ?? hpStaMax),
      max: hpStaMax,
    };
    char.vitals.woundThreshold = woundThreshold;
  }
}

function migrateDefiningSkillLevel(char: CharacterLike): number | undefined {
  if (char.definingSkillLevel != null) return char.definingSkillLevel;
  const legacy = char.professionAbilities?.[0]?.level;
  return legacy != null ? legacy : undefined;
}

function migrateProfessionTree(char: CharacterLike): Record<string, number> | undefined {
  const tree = { ...(char.professionTree ?? {}) };
  const occ = normalizeOccupation(char.occupation ?? "");
  if (!occ) return Object.keys(tree).length ? tree : undefined;

  const coreId = `${occ}:core`;
  if (tree[coreId] == null) {
    const legacy = migrateDefiningSkillLevel(char);
    if (legacy != null) tree[coreId] = legacy;
  }

  return Object.keys(tree).length ? tree : undefined;
}

function migrateInventory(char: CharacterLike) {
  const inventory = (char.inventory ?? []).map((item) => ({
    id: item.id ?? crypto.randomUUID(),
    qty: item.qty ?? 1,
    name: item.name ?? "",
    category: item.category ?? "custom",
    effect: item.effect ?? "",
    weight: item.weight ?? 0,
    ...(item.cost != null ? { cost: item.cost } : {}),
    ...(item.catalogId ? { catalogId: item.catalogId } : {}),
    ...(item.source ? { source: item.source } : {}),
  }));
  if (inventory.length > 0) return inventory;
  return (char.consumables ?? []).map((item) => ({
    id: item.id ?? crypto.randomUUID(),
    qty: item.qty ?? 1,
    name: item.name ?? "",
    category: "consumable",
    effect: item.effect ?? "",
    weight: item.weight ?? 0,
  }));
}

function normalizeCrowns(value: number | undefined): number | undefined {
  if (value == null) return undefined;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function stripRemovedFields<T extends CharacterLike>(char: T): T {
  const next = { ...char };
  delete next.adrenaline;
  if (next.vitals) {
    const { resolve: _resolve, ...vitals } = next.vitals as CharacterLike["vitals"] & {
      resolve?: unknown;
    };
    next.vitals = vitals;
  }
  return next;
}

/** Migrate legacy sheet data to current rulebook schema. */
export function normalizeCharacter<T extends CharacterLike>(char: T): T {
  const cleaned = stripRemovedFields(char);
  const race = cleaned.enemyKind === "monster" ? "" : normalizeRace(cleaned.race);
  const occupation =
    cleaned.enemyKind === "monster" ? "" : reconcileOccupation(race, cleaned.occupation);
  const attributes = migrateAttributes(cleaned);
  const skills = migrateSkills(cleaned.skills ?? {});
  const professionTree = migrateProfessionTree({ ...cleaned, occupation });
  const definingSkillLevel =
    professionTree?.[`${normalizeOccupation(occupation)}:core`] ??
    migrateDefiningSkillLevel(cleaned);
  const inventory = migrateInventory(cleaned);

  const next = {
    ...cleaned,
    race,
    occupation,
    attributes,
    skills,
    crowns: normalizeCrowns(cleaned.crowns),
    inventory,
    ...(professionTree ? { professionTree } : {}),
    ...(definingSkillLevel != null ? { definingSkillLevel } : {}),
  };

  applyDerived(next);
  return next;
}

/** Restore HP and STA to current maximum (e.g. after a rest). */
export function restCharacterVitals<T extends CharacterLike>(character: T): T {
  const normalized = normalizeCharacter(character);
  if (!normalized.vitals) return normalized;
  const hpMax = normalized.vitals.hp?.max ?? 0;
  const staMax = normalized.vitals.sta?.max ?? 0;
  return {
    ...normalized,
    vitals: {
      ...normalized.vitals,
      hp: { ...normalized.vitals.hp!, current: hpMax, max: hpMax },
      sta: { ...normalized.vitals.sta!, current: staMax, max: staMax },
    },
  };
}
