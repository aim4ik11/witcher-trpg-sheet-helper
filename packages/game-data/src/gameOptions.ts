export interface RaceOption {
  value: string;
  label: string;
}

export interface OccupationOption {
  value: string;
  label: string;
  spellcasting: boolean;
  /** Only Human or Elf may take this profession (core book). */
  humanOrElfOnly?: boolean;
  /** Must also select Witcher race. */
  witcherRaceOnly?: boolean;
}

export interface MagicCategory {
  key: string;
  label: string;
  occupations: string[];
}

/** Core book playable races. */
export const RACES: RaceOption[] = [
  { value: '',        label: '— Select race —' },
  { value: 'Human',   label: 'Human' },
  { value: 'Elf',     label: 'Elf' },
  { value: 'Dwarf',   label: 'Dwarf' },
  { value: 'Witcher', label: 'Witcher' },
];

/** Core book professions (9). */
export const OCCUPATIONS: OccupationOption[] = [
  { value: '',            label: '— Select occupation —', spellcasting: false },
  { value: 'Bard',        label: 'Bard',                  spellcasting: false },
  { value: 'Craftsman',   label: 'Craftsman',             spellcasting: false },
  { value: 'Criminal',    label: 'Criminal',              spellcasting: false },
  { value: 'Doctor',      label: 'Doctor',                spellcasting: false },
  { value: 'Mage',        label: 'Mage',                  spellcasting: true,  humanOrElfOnly: true },
  { value: 'Man At Arms', label: 'Man At Arms',           spellcasting: false },
  { value: 'Merchant',    label: 'Merchant',              spellcasting: false },
  { value: 'Priest',      label: 'Priest',                spellcasting: true,  humanOrElfOnly: true },
  { value: 'Witcher',     label: 'Witcher',               spellcasting: true,  witcherRaceOnly: true },
];

export const MAGIC_CATEGORIES: Record<string, MagicCategory> = {
  sign:       { key: 'sign',       label: 'Signs',       occupations: ['Witcher'] },
  spell:      { key: 'spell',      label: 'Spells',      occupations: ['Mage'] },
  invocation: { key: 'invocation', label: 'Invocations', occupations: ['Priest'] },
  hex:        { key: 'hex',        label: 'Hexes',        occupations: ['Witcher', 'Mage', 'Priest'] },
  ritual:     { key: 'ritual',     label: 'Rituals',      occupations: ['Mage', 'Priest'] },
};

export const MAGIC_ROW_EMPTY = {
  name: '', staCost: 0, staCostText: '', effect: '', duration: '', range: '', defense: '',
};

const OCCUPATION_ALIASES: Record<string, string> = {
  'Man-at-Arms': 'Man At Arms',
  Druid: 'Priest',
};

export function normalizeOccupation(occupation: string): string {
  const v = occupation || '';
  return OCCUPATION_ALIASES[v] ?? v;
}

export function getOccupationMeta(occupation: string): OccupationOption {
  const v = normalizeOccupation(occupation);
  return OCCUPATIONS.find((o) => o.value === v) ?? { value: v, label: v || '—', spellcasting: false };
}

export function isSpellcastingOccupation(occupation: string): boolean {
  return getOccupationMeta(occupation).spellcasting;
}

export function getMagicSections(occupation: string): MagicCategory[] {
  const occ = normalizeOccupation(occupation);
  return Object.values(MAGIC_CATEGORIES).filter((cat) => cat.occupations.includes(occ));
}

export function raceLabel(value: string): string {
  return RACES.find((r) => r.value === value)?.label ?? (value || '—');
}

export function occupationLabel(value: string): string {
  return getOccupationMeta(value).label;
}

export function spellsForCategory<T extends { category?: string }>(spells: T[] | undefined, category: string): T[] {
  return (spells ?? []).filter((s) => (s.category || 'spell') === category);
}
