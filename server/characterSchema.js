export const ATTRIBUTES = {
  ref: {
    key: 'ref',
    label: 'Reflex',
    short: 'REF',
    color: '#e8a0b8',
    skills: [
      { key: 'brawling', label: 'Brawling' },
      { key: 'dodgeEscape', label: 'Dodge/Escape' },
      { key: 'melee', label: 'Melee' },
      { key: 'riding', label: 'Riding' },
      { key: 'sailing', label: 'Sailing' },
      { key: 'smallBlades', label: 'Small Blades' },
      { key: 'staffSpear', label: 'Staff/Spear' },
      { key: 'swordsmanship', label: 'Swordsmanship' },
    ],
  },
  emp: {
    key: 'emp',
    label: 'Empathy',
    short: 'EMP',
    color: '#f0c4d0',
    skills: [
      { key: 'charisma', label: 'Charisma' },
      { key: 'deceit', label: 'Deceit' },
      { key: 'fineArts', label: 'Fine Arts' },
      { key: 'gambling', label: 'Gambling' },
      { key: 'grooming', label: 'Grooming & St.' },
      { key: 'humanPercep', label: 'Human Percep.' },
      { key: 'leadership', label: 'Leadership' },
      { key: 'persuasion', label: 'Persuasion' },
      { key: 'performance', label: 'Performance' },
      { key: 'seduction', label: 'Seduction' },
    ],
  },
  int: {
    key: 'int',
    label: 'Intelligence',
    short: 'INT',
    color: '#a8d4e8',
    skills: [
      { key: 'awareness', label: 'Awareness' },
      { key: 'business', label: 'Business' },
      { key: 'deduction', label: 'Deduction' },
      { key: 'education', label: 'Education' },
      { key: 'nordling', label: 'Nordling', special: true },
      { key: 'elderSpeech', label: 'Elder Speech', special: true },
      { key: 'dwarven', label: 'Dwarven', special: true },
      { key: 'monsterLore', label: 'Monster Lore', special: true },
      { key: 'socialEtiquette', label: 'Social Etiquette' },
      { key: 'streetwise', label: 'Streetwise' },
      { key: 'tactics', label: 'Tactics', special: true },
      { key: 'teaching', label: 'Teaching' },
      { key: 'wildernessSurv', label: 'Wilderness Surv.' },
    ],
  },
  dex: {
    key: 'dex',
    label: 'Dexterity',
    short: 'DEX',
    color: '#b8e0c8',
    skills: [
      { key: 'archery', label: 'Archery' },
      { key: 'athletics', label: 'Athletics' },
      { key: 'crossbow', label: 'Crossbow' },
      { key: 'sleightOfHand', label: 'Sleight of Hand' },
      { key: 'stealth', label: 'Stealth' },
    ],
  },
  will: {
    key: 'will',
    label: 'Will',
    short: 'WILL',
    color: '#c4b0e0',
    skills: [
      { key: 'courage', label: 'Courage' },
      { key: 'hexWeaving', label: 'Hex Weaving', special: true },
      { key: 'intimidation', label: 'Intimidation' },
      { key: 'spellCasting', label: 'Spell Casting', special: true },
      { key: 'resistMagic', label: 'Resist Magic', special: true },
      { key: 'resistCoercion', label: 'Resist Coercion' },
      { key: 'ritualCrafting', label: 'Ritual Crafting', special: true },
    ],
  },
  cra: {
    key: 'cra',
    label: 'Craft',
    short: 'CRA',
    color: '#e0d0b0',
    skills: [
      { key: 'alchemy', label: 'Alchemy', special: true },
      { key: 'crafting', label: 'Crafting', special: true },
      { key: 'disguise', label: 'Disguise' },
      { key: 'firstAid', label: 'First Aid' },
      { key: 'forgery', label: 'Forgery' },
      { key: 'pickLock', label: 'Pick Lock' },
      { key: 'trapCrafting', label: 'Trap Crafting', special: true },
    ],
  },
  body: {
    key: 'body',
    label: 'Body',
    short: 'BODY',
    color: '#dcc8a8',
    skills: [
      { key: 'physique', label: 'Physique' },
      { key: 'endurance', label: 'Endurance' },
    ],
  },
};

export const ARMOR_SLOTS = [
  { key: 'head', label: 'Head' },
  { key: 'torso', label: 'Torso' },
  { key: 'rArm', label: 'R. Arm' },
  { key: 'lArm', label: 'L. Arm' },
  { key: 'rLeg', label: 'R. Leg' },
  { key: 'lLeg', label: 'L. Leg' },
];

function emptySkills(attrKey) {
  const attr = ATTRIBUTES[attrKey];
  const skills = {};
  for (const skill of attr.skills) {
    skills[skill.key] = { level: 0 };
  }
  return skills;
}

export function createEmptyCharacter(overrides = {}) {
  const attributes = {};
  const skills = {};
  for (const key of Object.keys(ATTRIBUTES)) {
    attributes[key] = 0;
    skills[key] = emptySkills(key);
  }

  return {
    id: '',
    name: 'New Character',
    type: 'player',
    nickname: '',
    race: '',
    occupation: '',
    profession: '',
    attributes,
    skills,
    vitals: {
      hp: { current: 25, max: 25 },
      sta: { current: 25, max: 25 },
      resolve: { current: 25, max: 25 },
      woundThreshold: 0,
    },
    consumables: [],
    weapons: [],
    armor: ARMOR_SLOTS.map((slot) => ({
      slot: slot.key,
      name: '',
      sp: 0,
      damage: 0,
      effects: '',
      weight: 0,
    })),
    armorNotes: '',
    bonusMelee: { punch: '', kick: '' },
    luck: { max: 5, used: 0 },
    speed: 0,
    adrenaline: 0,
    movement: { run: 0, leap: 0 },
    recovery: { stun: 0, rec: 0 },
    improvementPoints: { ip: 0, trainingIp: 0 },
    professionAbilities: [],
    wounds: [],
    statusEffects: [],
    spells: [],
    ...overrides,
  };
}

export function calcVitalMaxes(character) {
  const body = character.attributes.body ?? 0;
  const will = character.attributes.will ?? 0;
  const int = character.attributes.int ?? 0;
  const hpStaMax = Math.round(((body + will) / 2) * 5);
  const resolveMax = Math.round(((int + will) / 2) * 5);
  return { hpStaMax, resolveMax };
}

export function applyCalculatedVitals(character) {
  const { hpStaMax, resolveMax } = calcVitalMaxes(character);
  const vitals = { ...character.vitals };
  vitals.hp = { ...vitals.hp, max: hpStaMax };
  vitals.sta = { ...vitals.sta, max: hpStaMax };
  vitals.resolve = { ...vitals.resolve, max: resolveMax };
  if (vitals.hp.current > hpStaMax) vitals.hp.current = hpStaMax;
  if (vitals.sta.current > hpStaMax) vitals.sta.current = hpStaMax;
  if (vitals.resolve.current > resolveMax) vitals.resolve.current = resolveMax;
  return { ...character, vitals };
}

export function skillBase(character, attrKey, skillKey) {
  const attr = character.attributes[attrKey] ?? 0;
  const level = character.skills[attrKey]?.[skillKey]?.level ?? 0;
  return attr + level;
}
