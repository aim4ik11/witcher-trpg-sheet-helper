/** Core book stat order: INT, REF, DEX, BODY, SPD, EMP, CRA, WILL, LUCK */
export const ATTRIBUTES: Record<string, { key: string; label: string; short: string }> =
  {
    int: { key: "int", label: "Intelligence", short: "INT" },
    ref: { key: "ref", label: "Reflex", short: "REF" },
    dex: { key: "dex", label: "Dexterity", short: "DEX" },
    body: { key: "body", label: "Body", short: "BODY" },
    spd: { key: "spd", label: "Speed", short: "SPD" },
    emp: { key: "emp", label: "Empathy", short: "EMP" },
    cra: { key: "cra", label: "Craft", short: "CRA" },
    will: { key: "will", label: "Will", short: "WILL" },
    luck: { key: "luck", label: "Luck", short: "LUCK" },
  };

export interface SkillDef {
  key: string;
  label: string;
  /** Costs 2 skill points per level at creation. */
  special?: boolean;
}

export const ATTRIBUTE_SKILLS: Record<string, SkillDef[]> = {
  int: [
    { key: "awareness", label: "Awareness" },
    { key: "business", label: "Business" },
    { key: "deduction", label: "Deduction" },
    { key: "education", label: "Education" },
    { key: "language", label: "Language", special: true },
    { key: "monsterLore", label: "Monster Lore", special: true },
    { key: "socialEtiquette", label: "Social Etiquette" },
    { key: "streetwise", label: "Streetwise" },
    { key: "tactics", label: "Tactics", special: true },
    { key: "teaching", label: "Teaching" },
    { key: "wildernessSurv", label: "Wilderness Surv." },
  ],
  ref: [
    { key: "brawling", label: "Brawling" },
    { key: "dodgeEscape", label: "Dodge/Escape" },
    { key: "melee", label: "Melee" },
    { key: "riding", label: "Riding" },
    { key: "sailing", label: "Sailing" },
    { key: "smallBlades", label: "Small Blades" },
    { key: "staffSpear", label: "Staff/Spear" },
    { key: "swordsmanship", label: "Swordsmanship" },
  ],
  dex: [
    { key: "archery", label: "Archery" },
    { key: "athletics", label: "Athletics" },
    { key: "crossbow", label: "Crossbow" },
    { key: "sleightOfHand", label: "Sleight of Hand" },
    { key: "stealth", label: "Stealth" },
  ],
  body: [
    { key: "physique", label: "Physique" },
    { key: "endurance", label: "Endurance" },
  ],
  emp: [
    { key: "charisma", label: "Charisma" },
    { key: "deceit", label: "Deceit" },
    { key: "fineArts", label: "Fine Arts" },
    { key: "gambling", label: "Gambling" },
    { key: "grooming", label: "Grooming & St." },
    { key: "humanPercep", label: "Human Percep." },
    { key: "leadership", label: "Leadership" },
    { key: "persuasion", label: "Persuasion" },
    { key: "performance", label: "Performance" },
    { key: "seduction", label: "Seduction" },
  ],
  cra: [
    { key: "alchemy", label: "Alchemy", special: true },
    { key: "crafting", label: "Crafting", special: true },
    { key: "disguise", label: "Disguise" },
    { key: "firstAid", label: "First Aid" },
    { key: "forgery", label: "Forgery" },
    { key: "pickLock", label: "Pick Lock" },
    { key: "trapCrafting", label: "Trap Crafting", special: true },
  ],
  will: [
    { key: "courage", label: "Courage" },
    { key: "hexWeaving", label: "Hex Weaving", special: true },
    { key: "intimidation", label: "Intimidation" },
    { key: "spellCasting", label: "Spell Casting", special: true },
    { key: "resistMagic", label: "Resist Magic", special: true },
    { key: "resistCoercion", label: "Resist Coercion" },
    { key: "ritualCrafting", label: "Ritual Crafting", special: true },
  ],
};

export const ARMOR_LABELS: Record<string, string> = {
  head: "Head",
  torso: "Torso",
  rArm: "R. Arm",
  lArm: "L. Arm",
  rLeg: "R. Leg",
  lLeg: "L. Leg",
};

export const POINT_BUY_OPTIONS = [
  { value: 60, label: "Average (60)" },
  { value: 70, label: "Skilled (70)" },
  { value: 75, label: "Heroes (75)" },
  { value: 80, label: "Legends (80)" },
] as const;

export const PHYSICAL_TABLE: Record<
  number,
  { hp: number; sta: number; rec: number; stun: number }
> = {
  2: { hp: 10, sta: 10, rec: 2, stun: 20 },
  3: { hp: 15, sta: 15, rec: 3, stun: 30 },
  4: { hp: 20, sta: 20, rec: 4, stun: 40 },
  5: { hp: 25, sta: 25, rec: 5, stun: 50 },
  6: { hp: 30, sta: 30, rec: 6, stun: 60 },
  7: { hp: 35, sta: 35, rec: 7, stun: 70 },
  8: { hp: 40, sta: 40, rec: 8, stun: 80 },
  9: { hp: 45, sta: 45, rec: 9, stun: 90 },
  10: { hp: 50, sta: 50, rec: 10, stun: 100 },
  11: { hp: 55, sta: 55, rec: 11, stun: 110 },
  12: { hp: 60, sta: 60, rec: 12, stun: 120 },
  13: { hp: 65, sta: 65, rec: 13, stun: 130 },
};

export const HAND_TO_HAND_TABLE: Record<
  number,
  { meleeBonus: number; punch: string; kick: string }
> = {
  2: { meleeBonus: -4, punch: "1d6−4", kick: "1d6" },
  4: { meleeBonus: -2, punch: "1d6−2", kick: "1d6+2" },
  6: { meleeBonus: 0, punch: "1d6", kick: "1d6+4" },
  8: { meleeBonus: 2, punch: "1d6+2", kick: "1d6+6" },
  10: { meleeBonus: 4, punch: "1d6+4", kick: "1d6+8" },
  12: { meleeBonus: 6, punch: "1d6+6", kick: "1d6+10" },
  13: { meleeBonus: 8, punch: "1d6+8", kick: "1d6+12" },
};

function clampTableKey(n: number): number {
  return Math.min(13, Math.max(2, n));
}

export function physicalAverage(body: number, will: number): number {
  return Math.floor((body + will) / 2);
}

export function handToHandRow(body: number) {
  const key = body < 1 ? 2 : Math.min(13, Math.max(2, Math.floor((body + 1) / 2) * 2));
  return HAND_TO_HAND_TABLE[key];
}

export function getSpd(character: {
  attributes?: Record<string, number>;
  speed?: number;
}): number {
  return character.attributes?.spd ?? character.speed ?? 0;
}

export function getLuckStat(character: {
  attributes?: Record<string, number>;
  luck?: { max?: number };
}): number {
  return character.attributes?.luck ?? character.luck?.max ?? 0;
}

export function calcVitalMaxes(character: { attributes?: Record<string, number> }) {
  const body = character.attributes?.body ?? 0;
  const will = character.attributes?.will ?? 0;
  const int = character.attributes?.int ?? 0;
  const avg = physicalAverage(body, will);
  const row = PHYSICAL_TABLE[clampTableKey(avg)];
  return {
    hpStaMax: row.hp,
    resolveMax: Math.floor(((int + will) / 2) * 5),
  };
}

export function calcDerivedStats(character: {
  attributes?: Record<string, number>;
  speed?: number;
  luck?: { max?: number };
}) {
  const body = character.attributes?.body ?? 0;
  const will = character.attributes?.will ?? 0;
  const spd = getSpd(character);
  const avg = physicalAverage(body, will);
  const phys = PHYSICAL_TABLE[clampTableKey(avg)];
  const hth = handToHandRow(body);
  const run = spd * 3;
  return {
    run,
    leap: Math.floor(run / 5),
    stun: phys.stun,
    rec: phys.rec,
    luckMax: getLuckStat(character),
    punch: hth.punch,
    kick: hth.kick,
    meleeBonus: hth.meleeBonus,
  };
}

export function skillBase(
  character: {
    attributes?: Record<string, number>;
    skills?: Record<string, Record<string, { level: number }>>;
  },
  attrKey: string,
  skillKey: string,
) {
  const attr = character.attributes?.[attrKey] ?? 0;
  const level = character.skills?.[attrKey]?.[skillKey]?.level ?? 0;
  return attr + level;
}
