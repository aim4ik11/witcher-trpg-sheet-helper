import { calcDerivedStats, calcVitalMaxes, getSpd } from './characterData';
import { normalizeOccupation, OCCUPATIONS, RACES, type OccupationOption } from './gameOptions';

const RACE_ALIASES: Record<string, string> = {
  Halfling: 'Human',
  Gnome: 'Human',
};

const VALID_RACES = new Set(RACES.map((r) => r.value).filter(Boolean));

const DEFAULT_ATTRIBUTES: Record<string, number> = {
  int: 1, ref: 1, dex: 1, body: 1, spd: 1, emp: 1, cra: 1, will: 1, luck: 1,
};

const LEGACY_LANGUAGE_KEYS = ['nordling', 'elderSpeech', 'dwarven'] as const;

export interface CharacterLike {
  race?: string;
  occupation?: string;
  enemyKind?: 'npc' | 'monster';
  bestiaryId?: string;
  attributes?: Record<string, number>;
  skills?: Record<string, Record<string, { level: number }>>;
  luck?: { max?: number; used?: number };
  speed?: number;
  vitals?: {
    hp?: { current?: number; max?: number };
    sta?: { current?: number; max?: number };
    resolve?: { current?: number; max?: number };
    woundThreshold?: number;
  };
  movement?: { run?: number; leap?: number };
  recovery?: { stun?: number; rec?: number };
  bonusMelee?: { punch?: string; kick?: string };
}

export function normalizeRace(race?: string): string {
  if (!race) return '';
  const mapped = RACE_ALIASES[race] ?? race;
  return VALID_RACES.has(mapped) ? mapped : '';
}

export function occupationsForRace(race: string): OccupationOption[] {
  return OCCUPATIONS.filter((occ) => {
    if (!occ.value) return true;
    if (occ.witcherRaceOnly) return race === 'Witcher';
    if (occ.value === 'Witcher') return race === 'Witcher';
    if (occ.humanOrElfOnly) return race === 'Human' || race === 'Elf';
    if (race === 'Witcher') return occ.value === 'Witcher';
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
  const occ = normalizeOccupation(occupation ?? '');
  if (!occ) {
    return race === 'Witcher' ? 'Witcher' : '';
  }
  if (isOccupationAllowed(race, occ)) return occ;
  if (race === 'Witcher') return 'Witcher';
  if (occ === 'Witcher') return '';
  return '';
}

function migrateAttributes(char: CharacterLike): Record<string, number> {
  const raw = char.attributes ?? {};
  const attrs: Record<string, number> = { ...DEFAULT_ATTRIBUTES };

  for (const [key, val] of Object.entries(raw)) {
    if (typeof val === 'number' && Number.isFinite(val)) attrs[key] = val;
  }

  if (!('spd' in raw) && (char.speed ?? 0) > 0) attrs.spd = char.speed!;
  if (!('luck' in raw) && char.luck?.max != null) {
    const legacyPlaceholder = char.luck.max === 5
      && Object.entries(raw).every(([k, v]) => k === 'luck' || v === 1);
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
    const int = attrs.int ?? 0;
    const will = attrs.will ?? 0;
    const resolveMax = Math.floor(((int + will) / 2) * 5);
    if (char.vitals && !char.vitals.resolve?.max) {
      char.vitals.resolve = {
        current: char.vitals.resolve?.current ?? resolveMax,
        max: resolveMax,
      };
    }
    return;
  }

  const { hpStaMax, resolveMax } = calcVitalMaxes(char);
  const d = calcDerivedStats(char);
  char.speed = getSpd(char);
  char.luck = { max: d.luckMax, used: char.luck?.used ?? 0 };
  char.movement = { run: d.run, leap: d.leap };
  char.recovery = { stun: d.stun, rec: d.rec };
  char.bonusMelee = { punch: d.punch, kick: d.kick };
  if (char.vitals) {
    char.vitals.hp = { current: char.vitals.hp?.current ?? 0, max: hpStaMax };
    char.vitals.sta = { current: char.vitals.sta?.current ?? 0, max: hpStaMax };
    char.vitals.resolve = { current: char.vitals.resolve?.current ?? 0, max: resolveMax };
  }
}

/** Migrate legacy sheet data to current rulebook schema. */
export function normalizeCharacter<T extends CharacterLike>(char: T): T {
  const race = char.enemyKind === 'monster' ? '' : normalizeRace(char.race);
  const occupation = char.enemyKind === 'monster'
    ? ''
    : reconcileOccupation(race, char.occupation);
  const attributes = migrateAttributes(char);
  const skills = migrateSkills(char.skills ?? {});

  const next = {
    ...char,
    race,
    occupation,
    attributes,
    skills,
  };

  applyDerived(next);
  return next;
}
