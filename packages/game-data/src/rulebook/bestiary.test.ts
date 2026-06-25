/**
 * Rulebook: `sections/172-example-combat.md`, `sections/268-monster-types.md`, `sections/278-ghouls.md`
 */
import { describe, expect, it } from "vitest";
import {
  MONSTERS_CATALOG,
  catalogToEnemy,
  getMonsterById,
  monsterCatalogGroups,
  validateBestiaryCombatData,
} from "../monsters";
import { skillBase } from "../characterData";
import { inferWeaponSkill } from "../attack";

describe("rulebook bestiary — catalog integrity", () => {
  it("every entry has HP, weapons, and an attack skill", () => {
    const issues = validateBestiaryCombatData();
    expect(issues).toEqual([]);
  });

  it("groups NPCs, monsters, and beasts separately", () => {
    const groups = monsterCatalogGroups();
    expect(groups.map((g) => g.label)).toEqual([
      "Humanoid NPCs",
      "Monsters",
      "Beasts & Animals",
    ]);
    expect(groups[1]!.entries.every((m) => m.kind === "monster")).toBe(true);
    expect(groups[1]!.entries.every((m) => m.monsterType !== "Beast")).toBe(true);
  });
});

describe("rulebook §172 / §278 — ghouls", () => {
  const ghouls = getMonsterById("ghouls")!;

  it("ghouls are Necrophage monsters organized in packs", () => {
    expect(ghouls).toBeDefined();
    expect(ghouls.monsterType).toBe("Necrophage");
    expect(ghouls.organization).toMatch(/pack/i);
  });

  it("ghoul stats match bestiary: REF 6, HP 25, STA 25", () => {
    expect(ghouls.attributes.ref).toBe(6);
    expect(ghouls.combat.hp).toBe(25);
    expect(ghouls.combat.sta).toBe(25);
  });

  it("ghouls have melee and brawling at 6 for example combat", () => {
    const melee = ghouls.skills.find((s) => s.key === "melee");
    const brawling = ghouls.skills.find((s) => s.key === "brawling");
    expect(melee?.level).toBe(6);
    expect(brawling?.level).toBe(6);
  });

  it("catalogToEnemy builds a fight-ready ghoul with wound threshold HP÷5", () => {
    const enemy = catalogToEnemy("Ghoul Pack", ghouls);
    expect(enemy.type).toBe("enemy");
    expect(enemy.enemyKind).toBe("monster");
    expect(enemy.vitals.hp.max).toBe(25);
    expect(enemy.vitals.woundThreshold).toBe(5);
    expect(enemy.weapons.length).toBeGreaterThan(0);
    expect(enemy.monsterProfile?.monsterType).toBe("Necrophage");
  });

  it("ghoul claw attack uses brawling skill", () => {
    const claw = ghouls.weapons.find((w) => /claw/i.test(w.name));
    expect(claw?.dmg).toBeTruthy();
    const enemy = catalogToEnemy("Ghoul", ghouls);
    const skillRef = inferWeaponSkill({
      name: claw!.name,
      rng: claw?.rng ?? "",
      hand: "",
    });
    expect(skillRef.skillKey).toBe("brawling");
    expect(skillBase(enemy, skillRef.attrKey, skillRef.skillKey)).toBe(6 + 6);
  });
});

describe("rulebook bestiary — monster types present in catalog", () => {
  const MONSTER_TYPES = [
    "Necrophage",
    "Specter",
    "Hybrid",
    "Insectoid",
    "Elementa",
    "Draconid",
    "Relict",
    "Ogroid",
    "Cursed One",
    "Beast",
  ];

  it.each(MONSTER_TYPES)('catalog includes at least one "%s" entry', (type) => {
    const found = MONSTERS_CATALOG.some((m) => m.monsterType === type);
    expect(found, `no ${type} in bestiary`).toBe(true);
  });
});
