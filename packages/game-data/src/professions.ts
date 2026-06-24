import { ATTRIBUTE_SKILLS, skillBase } from "./characterData";
import { normalizeOccupation } from "./gameOptions";

/** Profession skill packages from the core rulebook (44 pts across 11 skills). */

export interface ProfessionDef {
  key: string;
  definingSkill: string;
  vigor: number;
  skills: string[];
  notes?: string;
}

export const PROFESSIONS: Record<string, ProfessionDef> = {
  Bard: {
    key: "Bard",
    definingSkill: "Busking (EMP)",
    vigor: 0,
    skills: [
      "Charisma",
      "Deceit",
      "Performance",
      "Language",
      "Human Perception",
      "Persuasion",
      "Streetwise",
      "Fine Arts",
      "Seduction",
      "Social Etiquette",
    ],
  },
  Craftsman: {
    key: "Craftsman",
    definingSkill: "Patch Job (CRA)",
    vigor: 0,
    skills: [
      "Crafting",
      "Business",
      "Athletics",
      "Endurance",
      "Physique",
      "Streetwise",
      "Fine Arts",
      "Alchemy",
      "Education",
      "Persuasion",
    ],
  },
  Criminal: {
    key: "Criminal",
    definingSkill: "Practiced Paranoia (INT)",
    vigor: 0,
    skills: [
      "Sleight of Hand",
      "Pick Lock",
      "Streetwise",
      "Forgery",
      "Deceit",
      "Stealth",
      "Intimidation",
      "Small Blades",
      "Athletics",
      "Awareness",
    ],
  },
  Doctor: {
    key: "Doctor",
    definingSkill: "Healing Hands (CRA)",
    vigor: 0,
    skills: [
      "Resist Coercion",
      "Charisma",
      "Social Etiquette",
      "Courage",
      "Human Perception",
      "Wilderness Survival",
      "Business",
      "Deduction",
      "Small Blades",
      "Alchemy",
    ],
  },
  Mage: {
    key: "Mage",
    definingSkill: "Magic Training (INT)",
    vigor: 5,
    skills: [
      "Human Perception",
      "Spell Casting",
      "Hex Weaving",
      "Resist Magic",
      "Staff/Spear",
      "Education",
      "Ritual Crafting",
      "Social Etiquette",
      "Seduction",
      "Grooming & Style",
    ],
    notes: "Humans and elves only.",
  },
  "Man At Arms": {
    key: "Man At Arms",
    definingSkill: "Tough As Nails (BODY)",
    vigor: 0,
    skills: [
      "Wilderness Survival",
      "Courage",
      "Physique",
      "Intimidation",
      "Dodge/Escape",
      "+ 5 combat skills (Brawling, Melee, Archery, etc.)",
    ],
  },
  Merchant: {
    key: "Merchant",
    definingSkill: "Well Traveled (INT)",
    vigor: 0,
    skills: [
      "Charisma",
      "Small Blades",
      "Education",
      "Language",
      "Streetwise",
      "Business",
      "Persuasion",
      "Human Perception",
      "Gambling",
      "Resist Coercion",
    ],
    notes: "Starts with cart, mule, and 1000 crowns of goods.",
  },
  Priest: {
    key: "Priest",
    definingSkill: "Initiate of the Gods (EMP)",
    vigor: 2,
    skills: [
      "Ritual Crafting",
      "Leadership",
      "Courage",
      "Human Perception",
      "Hex Weaving",
      "First Aid",
      "Charisma",
      "Wilderness Survival",
      "Teaching",
      "Spell Casting",
    ],
    notes: "Humans and elves only.",
  },
  Witcher: {
    key: "Witcher",
    definingSkill: "Witcher Training (INT)",
    vigor: 2,
    skills: [
      "Awareness",
      "Deduction",
      "Spell Casting",
      "Alchemy",
      "Dodge/Escape",
      "Wilderness Survival",
      "Swordsmanship",
      "Athletics",
      "Stealth",
      "Riding",
    ],
    notes: "Must take Witcher race. All basic signs.",
  },
};

const STAT_FROM_ABBREV: Record<string, string> = {
  INT: "int",
  REF: "ref",
  DEX: "dex",
  BODY: "body",
  SPD: "spd",
  EMP: "emp",
  CRA: "cra",
  WILL: "will",
};

const SKILL_LABEL_ALIASES: Record<string, string> = {
  "human perception": "Human Percep.",
  "wilderness survival": "Wilderness Surv.",
  "grooming & style": "Grooming & St.",
  "grooming and style": "Grooming & St.",
  language: "Language",
};

function normalizeSkillLabel(label: string): string {
  return label.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
}

const SKILL_BY_NORMALIZED_LABEL = (() => {
  const map = new Map<
    string,
    { attrKey: string; skillKey: string; label: string; special?: boolean }
  >();
  for (const [attrKey, skills] of Object.entries(ATTRIBUTE_SKILLS)) {
    for (const skill of skills) {
      map.set(normalizeSkillLabel(skill.label), {
        attrKey,
        skillKey: skill.key,
        label: skill.label,
        special: skill.special,
      });
    }
  }
  for (const [alias, canonical] of Object.entries(SKILL_LABEL_ALIASES)) {
    const resolved = map.get(normalizeSkillLabel(canonical));
    if (resolved) map.set(alias, resolved);
  }
  return map;
})();

export function getProfession(occupation: string): ProfessionDef | undefined {
  const key = normalizeOccupation(occupation);
  return key ? PROFESSIONS[key] : undefined;
}

export function parseDefiningSkill(definingSkill: string): {
  name: string;
  attrKey: string;
  statShort: string;
} {
  const match = definingSkill.match(/^(.+?)\s*\(([A-Z]+)\)$/);
  if (!match) {
    return { name: definingSkill, attrKey: "int", statShort: "INT" };
  }
  const statShort = match[2];
  return {
    name: match[1].trim(),
    attrKey: STAT_FROM_ABBREV[statShort] ?? "int",
    statShort,
  };
}

export function resolveProfessionSkillLabel(label: string): {
  attrKey: string;
  skillKey: string;
  label: string;
  special?: boolean;
} | null {
  return SKILL_BY_NORMALIZED_LABEL.get(normalizeSkillLabel(label)) ?? null;
}

export interface ProfessionSkillRow {
  kind: "defining" | "package" | "note";
  label: string;
  attrKey?: string;
  skillKey?: string;
  statShort?: string;
  level?: number;
  base?: number;
  special?: boolean;
}

export function getProfessionSkillRows(character: {
  occupation?: string;
  attributes?: Record<string, number>;
  skills?: Record<string, Record<string, { level: number }>>;
  definingSkillLevel?: number;
  professionAbilities?: { level?: number }[];
}): ProfessionSkillRow[] {
  const profession = getProfession(character.occupation ?? "");
  if (!profession) return [];

  const defining = parseDefiningSkill(profession.definingSkill);
  const definingLevel =
    character.definingSkillLevel ?? character.professionAbilities?.[0]?.level ?? 0;
  const definingAttr = character.attributes?.[defining.attrKey] ?? 0;

  const rows: ProfessionSkillRow[] = [
    {
      kind: "defining",
      label: defining.name,
      attrKey: defining.attrKey,
      statShort: defining.statShort,
      level: definingLevel,
      base: definingAttr + definingLevel,
    },
  ];

  for (const skillLabel of profession.skills) {
    if (skillLabel.startsWith("+")) {
      rows.push({ kind: "note", label: skillLabel });
      continue;
    }
    const resolved = resolveProfessionSkillLabel(skillLabel);
    if (!resolved) {
      rows.push({ kind: "note", label: skillLabel });
      continue;
    }
    rows.push({
      kind: "package",
      label: resolved.label,
      attrKey: resolved.attrKey,
      skillKey: resolved.skillKey,
      level: character.skills?.[resolved.attrKey]?.[resolved.skillKey]?.level ?? 0,
      base: skillBase(character, resolved.attrKey, resolved.skillKey),
      special: resolved.special,
    });
  }

  return rows;
}
