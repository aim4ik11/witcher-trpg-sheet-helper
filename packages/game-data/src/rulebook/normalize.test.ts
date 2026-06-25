/**
 * Rulebook: `curated/statistics.md`, migration from legacy sheet data
 */
import { describe, expect, it } from "vitest";
import type { Character } from "@wilmak/shared";
import { calcVitalMaxes, woundThresholdFromMaxHp } from "../characterData";
import { normalizeCharacter, restCharacterVitals, type CharacterLike } from "../normalizeCharacter";

describe("rulebook normalize — vitals from physical table", () => {
  it("new characters start at full HP and STA", () => {
    const char = normalizeCharacter({
      type: "player",
      name: "Fresh",
      attributes: {
        int: 5,
        ref: 5,
        dex: 5,
        body: 5,
        spd: 5,
        emp: 5,
        cra: 5,
        will: 5,
        luck: 1,
      },
      skills: {},
      vitals: {
        hp: { current: 0, max: 0 },
        sta: { current: 0, max: 0 },
        woundThreshold: 0,
      },
    }) as unknown as Character;
    expect(char.vitals.hp.current).toBe(char.vitals.hp.max);
    expect(char.vitals.sta.current).toBe(char.vitals.sta.max);
    expect(char.vitals.hp.max).toBe(25);
    expect(char.vitals.woundThreshold).toBe(5);
  });

  it("derives RUN, LEAP, STUN, REC from BODY, WILL, SPD", () => {
    const char = normalizeCharacter({
      type: "player",
      name: "Derived",
      attributes: {
        int: 5,
        ref: 5,
        dex: 5,
        body: 5,
        spd: 6,
        emp: 5,
        cra: 5,
        will: 5,
        luck: 1,
      },
      skills: {},
      vitals: { hp: { current: 10, max: 25 }, sta: { current: 10, max: 25 }, woundThreshold: 0 },
    }) as unknown as Character;
    expect(char.movement?.run).toBe(18);
    expect(char.movement?.leap).toBe(3);
    expect(char.recovery?.stun).toBe(50);
    expect(char.recovery?.rec).toBe(5);
  });

  it("rest restores HP and STA to max without changing maximums", () => {
    const wounded = normalizeCharacter({
      type: "player",
      name: "Wounded",
      attributes: {
        int: 5,
        ref: 5,
        dex: 5,
        body: 5,
        spd: 5,
        emp: 5,
        cra: 5,
        will: 5,
        luck: 1,
      },
      skills: {},
      vitals: { hp: { current: 8, max: 25 }, sta: { current: 3, max: 25 }, woundThreshold: 5 },
    });
    const rested = restCharacterVitals(wounded);
    expect(rested.vitals.hp).toEqual({ current: 25, max: 25 });
    expect(rested.vitals.sta).toEqual({ current: 25, max: 25 });
  });

  it("bestiary enemies keep printed HP but still get wound threshold from max HP", () => {
    const enemy = normalizeCharacter({
      type: "enemy",
      name: "Ghoul",
      bestiaryId: "ghouls",
      attributes: { ref: 5, dex: 5, body: 5 },
      skills: {},
      vitals: { hp: { current: 25, max: 25 }, sta: { current: 10, max: 10 }, woundThreshold: 99 },
    });
    expect(enemy.vitals.woundThreshold).toBe(woundThresholdFromMaxHp(25));
  });

  it("strips removed optional-rule fields from legacy saves", () => {
    const char = normalizeCharacter({
      type: "player",
      name: "Legacy",
      attributes: {
        int: 5,
        ref: 5,
        dex: 5,
        body: 5,
        spd: 5,
        emp: 5,
        cra: 5,
        will: 5,
        luck: 1,
      },
      skills: {},
      adrenaline: 2,
      vitals: {
        hp: { current: 20, max: 25 },
        sta: { current: 20, max: 25 },
        resolve: { current: 10, max: 10 },
        woundThreshold: 99,
      },
    } as CharacterLike & Pick<Character, "type" | "name">) as unknown as Character;
    expect("adrenaline" in char).toBe(false);
    expect("resolve" in char.vitals).toBe(false);
    const { woundThreshold } = calcVitalMaxes(char);
    expect(char.vitals.woundThreshold).toBe(woundThreshold);
  });
});
