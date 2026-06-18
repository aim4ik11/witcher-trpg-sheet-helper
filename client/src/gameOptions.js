export const RACES = [
  { value: '', label: '— Select race —' },
  { value: 'Human', label: 'Human' },
  { value: 'Elf', label: 'Elf' },
  { value: 'Dwarf', label: 'Dwarf' },
  { value: 'Halfling', label: 'Halfling' },
  { value: 'Gnome', label: 'Gnome' },
  { value: 'Witcher', label: 'Witcher' },
];

export const OCCUPATIONS = [
  { value: '', label: '— Select occupation —', spellcasting: false },
  { value: 'Witcher', label: 'Witcher', spellcasting: true },
  { value: 'Mage', label: 'Mage', spellcasting: true },
  { value: 'Priest', label: 'Priest', spellcasting: true },
  { value: 'Druid', label: 'Druid', spellcasting: true },
  { value: 'Man-at-Arms', label: 'Man-at-Arms', spellcasting: false },
  { value: 'Criminal', label: 'Criminal', spellcasting: false },
  { value: 'Doctor', label: 'Doctor', spellcasting: false },
  { value: 'Merchant', label: 'Merchant', spellcasting: false },
  { value: 'Bard', label: 'Bard', spellcasting: false },
  { value: 'Craftsman', label: 'Craftsman', spellcasting: false },
];

/** Magic categories shown per occupation on the Magic tab */
export const MAGIC_CATEGORIES = {
  sign: { key: 'sign', label: 'Signs', occupations: ['Witcher'] },
  spell: { key: 'spell', label: 'Spells', occupations: ['Mage', 'Druid'] },
  invocation: { key: 'invocation', label: 'Invocations', occupations: ['Priest'] },
  hex: { key: 'hex', label: 'Hexes', occupations: ['Witcher', 'Mage'] },
  ritual: { key: 'ritual', label: 'Rituals', occupations: ['Mage', 'Priest', 'Druid'] },
};

export function getOccupationMeta(occupation) {
  const value = occupation || '';
  return OCCUPATIONS.find((o) => o.value === value) ?? { value, label: value || '—', spellcasting: false };
}

export function isSpellcastingOccupation(occupation) {
  return getOccupationMeta(occupation).spellcasting;
}

export function getMagicSections(occupation) {
  const occ = occupation || '';
  return Object.values(MAGIC_CATEGORIES).filter((cat) => cat.occupations.includes(occ));
}

export function raceLabel(value) {
  return RACES.find((r) => r.value === value)?.label ?? (value || '—');
}

export function occupationLabel(value) {
  return getOccupationMeta(value).label;
}

export function spellsForCategory(spells, category) {
  return (spells ?? []).filter((s) => (s.category || 'spell') === category);
}

export const MAGIC_ROW_EMPTY = {
  name: '',
  staCost: 0,
  effect: '',
  duration: '',
  range: '',
};
