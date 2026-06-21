export const ATTRIBUTES: Record<string, { key: string; label: string; short: string }> = {
  ref:  { key: 'ref',  label: 'Reflex',       short: 'REF'  },
  emp:  { key: 'emp',  label: 'Empathy',       short: 'EMP'  },
  int:  { key: 'int',  label: 'Intelligence',  short: 'INT'  },
  dex:  { key: 'dex',  label: 'Dexterity',     short: 'DEX'  },
  will: { key: 'will', label: 'Will',           short: 'WILL' },
  cra:  { key: 'cra',  label: 'Craft',          short: 'CRA'  },
  body: { key: 'body', label: 'Body',           short: 'BODY' },
};

export interface SkillDef {
  key: string;
  label: string;
  special?: boolean;
}

export const ATTRIBUTE_SKILLS: Record<string, SkillDef[]> = {
  ref: [
    { key: 'brawling',     label: 'Brawling' },
    { key: 'dodgeEscape',  label: 'Dodge/Escape' },
    { key: 'melee',        label: 'Melee' },
    { key: 'riding',       label: 'Riding' },
    { key: 'sailing',      label: 'Sailing' },
    { key: 'smallBlades',  label: 'Small Blades' },
    { key: 'staffSpear',   label: 'Staff/Spear' },
    { key: 'swordsmanship',label: 'Swordsmanship' },
  ],
  emp: [
    { key: 'charisma',      label: 'Charisma' },
    { key: 'deceit',        label: 'Deceit' },
    { key: 'fineArts',      label: 'Fine Arts' },
    { key: 'gambling',      label: 'Gambling' },
    { key: 'grooming',      label: 'Grooming & St.' },
    { key: 'humanPercep',   label: 'Human Percep.' },
    { key: 'leadership',    label: 'Leadership' },
    { key: 'persuasion',    label: 'Persuasion' },
    { key: 'performance',   label: 'Performance' },
    { key: 'seduction',     label: 'Seduction' },
  ],
  int: [
    { key: 'awareness',       label: 'Awareness' },
    { key: 'business',        label: 'Business' },
    { key: 'deduction',       label: 'Deduction' },
    { key: 'education',       label: 'Education' },
    { key: 'nordling',        label: 'Nordling',          special: true },
    { key: 'elderSpeech',     label: 'Elder Speech',      special: true },
    { key: 'dwarven',         label: 'Dwarven',           special: true },
    { key: 'monsterLore',     label: 'Monster Lore',      special: true },
    { key: 'socialEtiquette', label: 'Social Etiquette' },
    { key: 'streetwise',      label: 'Streetwise' },
    { key: 'tactics',         label: 'Tactics',           special: true },
    { key: 'teaching',        label: 'Teaching' },
    { key: 'wildernessSurv',  label: 'Wilderness Surv.' },
  ],
  dex: [
    { key: 'archery',       label: 'Archery' },
    { key: 'athletics',     label: 'Athletics' },
    { key: 'crossbow',      label: 'Crossbow' },
    { key: 'sleightOfHand', label: 'Sleight of Hand' },
    { key: 'stealth',       label: 'Stealth' },
  ],
  will: [
    { key: 'courage',         label: 'Courage' },
    { key: 'hexWeaving',      label: 'Hex Weaving',     special: true },
    { key: 'intimidation',    label: 'Intimidation' },
    { key: 'spellCasting',    label: 'Spell Casting',   special: true },
    { key: 'resistMagic',     label: 'Resist Magic',    special: true },
    { key: 'resistCoercion',  label: 'Resist Coercion' },
    { key: 'ritualCrafting',  label: 'Ritual Crafting', special: true },
  ],
  cra: [
    { key: 'alchemy',      label: 'Alchemy',       special: true },
    { key: 'crafting',     label: 'Crafting',      special: true },
    { key: 'disguise',     label: 'Disguise' },
    { key: 'firstAid',     label: 'First Aid' },
    { key: 'forgery',      label: 'Forgery' },
    { key: 'pickLock',     label: 'Pick Lock' },
    { key: 'trapCrafting', label: 'Trap Crafting', special: true },
  ],
  body: [
    { key: 'physique',   label: 'Physique' },
    { key: 'endurance',  label: 'Endurance' },
  ],
};

export const ARMOR_LABELS: Record<string, string> = {
  head:  'Head',
  torso: 'Torso',
  rArm:  'R. Arm',
  lArm:  'L. Arm',
  rLeg:  'R. Leg',
  lLeg:  'L. Leg',
};

export function calcVitalMaxes(character: { attributes?: Record<string, number> }) {
  const body = character.attributes?.body ?? 0;
  const will = character.attributes?.will ?? 0;
  const int  = character.attributes?.int  ?? 0;
  return {
    hpStaMax:   Math.round(((body + will) / 2) * 5),
    resolveMax: Math.round(((int  + will) / 2) * 5),
  };
}

export function skillBase(
  character: { attributes?: Record<string, number>; skills?: Record<string, Record<string, { level: number }>> },
  attrKey: string,
  skillKey: string,
) {
  const attr  = character.attributes?.[attrKey] ?? 0;
  const level = character.skills?.[attrKey]?.[skillKey]?.level ?? 0;
  return attr + level;
}
