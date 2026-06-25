import monstersCatalog from "./data/monsters.json";

export interface CatalogMonsterSkill {
  attr: string;
  key: string;
  label: string;
  level: number;
}

export interface CatalogMonsterWeapon {
  name: string;
  dmg: string;
  effect: string;
  rof: string;
  rng?: string;
}

export interface CatalogMonster {
  id: string;
  name: string;
  kind: "npc" | "monster";
  monsterType: string;
  defaultRace?: string;
  threat?: string;
  bounty?: number | null;
  naturalArmor?: number;
  height?: string;
  weight?: string;
  environment?: string;
  intelligence?: string;
  organization?: string;
  attributes: Record<string, number>;
  combat: Record<string, number>;
  skills: CatalogMonsterSkill[];
  weapons: CatalogMonsterWeapon[];
  abilities?: string;
  vulnerabilities?: string;
  loot?: string;
}

export const MONSTERS_CATALOG: CatalogMonster[] = monstersCatalog as CatalogMonster[];

export function getMonsterById(id: string): CatalogMonster | undefined {
  return MONSTERS_CATALOG.find((m) => m.id === id);
}

export interface BestiaryCombatIssue {
  monsterId: string;
  monsterName: string;
  problems: string[];
}

/** Validate catalog entries have minimum data needed for combat resolution. */
export function validateBestiaryCombatData(
  catalog: CatalogMonster[] = MONSTERS_CATALOG,
): BestiaryCombatIssue[] {
  const attackSkills = new Set([
    "melee",
    "brawling",
    "swordsmanship",
    "archery",
    "crossbow",
    "staffSpear",
    "smallBlades",
  ]);
  const issues: BestiaryCombatIssue[] = [];

  for (const entry of catalog) {
    const problems: string[] = [];
    if (!entry.combat?.hp) problems.push("missing combat.hp");
    if (!entry.weapons?.length) problems.push("no weapons");
    if (!entry.skills?.some((s) => attackSkills.has(s.key))) {
      problems.push("no melee/brawling attack skill");
    }
    for (const weapon of entry.weapons ?? []) {
      if (!weapon.name) problems.push("weapon missing name");
      if (!weapon.dmg) problems.push(`weapon "${weapon.name}" missing dmg`);
      if (!weapon.rof?.trim()) problems.push(`weapon "${weapon.name}" missing rof`);
    }
    if (problems.length > 0) {
      issues.push({ monsterId: entry.id, monsterName: entry.name, problems });
    }
  }
  return issues;
}

export function monsterCatalogGroups(): { label: string; entries: CatalogMonster[] }[] {
  const npcs = MONSTERS_CATALOG.filter((m) => m.kind === "npc");
  const monsters = MONSTERS_CATALOG.filter(
    (m) => m.kind === "monster" && m.monsterType !== "Beast",
  );
  const beasts = MONSTERS_CATALOG.filter(
    (m) => m.kind === "monster" && m.monsterType === "Beast",
  );
  return [
    { label: "Humanoid NPCs", entries: npcs },
    { label: "Monsters", entries: monsters },
    { label: "Beasts & Animals", entries: beasts },
  ];
}

function buildSkills(
  template: CatalogMonster,
): Record<string, Record<string, { level: number }>> {
  const skills: Record<string, Record<string, { level: number }>> = {};
  for (const s of template.skills) {
    if (!skills[s.attr]) skills[s.attr] = {};
    skills[s.attr][s.key] = { level: s.level };
  }
  return skills;
}

function buildWeapons(template: CatalogMonster) {
  return template.weapons.map((w) => ({
    id: crypto.randomUUID(),
    name: w.name,
    type: "",
    wa: 0,
    dmg: w.dmg,
    rel: "",
    rateOfFire: Math.max(1, parseInt(w.rof, 10) || 1),
    hand: "",
    rng: w.rng ?? (w.effect.startsWith("RNG:") ? w.effect : ""),
    effect: w.effect.startsWith("RNG:") ? "" : w.effect,
    conc: "",
    enhancements: "",
    weight: 0,
  }));
}

/** Build a partial Character from a bestiary catalog entry. */
export function catalogToEnemy(name: string, template: CatalogMonster) {
  const attrs = { ...template.attributes };
  const hp = template.combat.hp ?? 0;
  const sta = template.combat.sta ?? 0;

  return {
    type: "enemy" as const,
    name,
    enemyKind: template.kind,
    bestiaryId: template.id,
    race: template.defaultRace ?? "",
    occupation: template.kind === "npc" ? "" : undefined,
    attributes: attrs,
    skills: buildSkills(template),
    vitals: {
      hp: { current: hp, max: hp },
      sta: { current: sta, max: sta },
      woundThreshold: Math.floor(hp / 5),
    },
    luck: { max: attrs.luck ?? 0, used: 0 },
    speed: attrs.spd ?? 0,
    movement: {
      run: template.combat.run ?? 0,
      leap: template.combat.leap ?? 0,
    },
    recovery: {
      stun: template.combat.stun ?? 0,
      rec: template.combat.rec ?? 0,
    },
    weapons: buildWeapons(template),
    monsterProfile: {
      catalogId: template.id,
      monsterType: template.monsterType,
      threat: template.threat,
      bounty: template.bounty ?? undefined,
      naturalArmor: template.naturalArmor,
      height: template.height,
      weight: template.weight,
      environment: template.environment,
      intelligence: template.intelligence,
      organization: template.organization,
      abilities: template.abilities,
      vulnerabilities: template.vulnerabilities,
      loot: template.loot,
      vigor: template.combat.vigor,
      encumbrance: template.combat.enc,
    },
  };
}
