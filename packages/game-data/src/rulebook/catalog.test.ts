/**
 * Rulebook: `curated/gear-weapons.md`, `curated/gear-armor.md`
 */
import { describe, expect, it } from "vitest";
import {
  ARMOR_CATALOG,
  WEAPONS_CATALOG,
  catalogToArmorPiece,
  catalogToWeapon,
  getArmorForSlot,
  searchCatalog,
} from "../catalog";

describe("rulebook gear — weapon catalog matches core tables", () => {
  function weapon(name: string) {
    const item = WEAPONS_CATALOG.find((w) => w.name === name);
    expect(item, `missing catalog weapon: ${name}`).toBeDefined();
    return item!;
  }

  it("Iron Long Sword: S/P, 2d6+2, rel 10, 2 hands", () => {
    const w = weapon("Iron Long Sword");
    expect(w.type).toBe("S/P");
    expect(w.dmg).toBe("2d6+2");
    expect(w.rel).toBe("10");
    expect(w.hand).toBe("2");
  });

  it("Arming Sword: 2d6+4, rel 15, 1 hand", () => {
    const w = weapon("Arming Sword");
    expect(w.dmg).toBe("2d6+4");
    expect(w.rel).toBe("15");
    expect(w.hand).toBe("1");
  });

  it("Dagger: 1d6+2, concealable small blade", () => {
    const w = weapon("Dagger");
    expect(w.dmg).toBe("1d6+2");
    expect(w.rel).toBe("10");
  });

  it("Long Bow: 4d6 damage, 2 hands (rulebook ranged weapon)", () => {
    const bow = weapon("Long Bow");
    expect(bow.dmg).toBe("4d6");
    expect(bow.hand).toBe("2");
    expect(bow.rel).toBe("10");
  });

  it("catalogToWeapon copies stats for sheet use", () => {
    const item = weapon("Iron Long Sword");
    const sheet = catalogToWeapon(item);
    expect(sheet.name).toBe("Iron Long Sword");
    expect(sheet.dmg).toBe("2d6+2");
    expect(sheet.wa).toBe(0);
    expect(sheet.catalogId).toBe(item.id);
  });
});

describe("rulebook gear — armor catalog matches core tables", () => {
  function armor(name: string) {
    const item = ARMOR_CATALOG.find((a) => a.name === name);
    expect(item, `missing catalog armor: ${name}`).toBeDefined();
    return item!;
  }

  it("Gambeson torso SP 3", () => {
    const a = armor("Gambeson");
    expect(a.slot).toBe("torso");
    expect(a.sp).toBe(3);
  });

  it("Chain Coif head SP 12", () => {
    const a = armor("Chain Coif");
    expect(a.slot).toBe("head");
    expect(a.sp).toBe(12);
  });

  it("Plate Greaves leg SP 20", () => {
    const a = armor("Plate Greaves");
    expect(a.slot).toBe("rLeg");
    expect(a.sp).toBe(20);
  });

  it("Temerian Shield SP 8 (medium shield per rulebook)", () => {
    const shield = armor("Temerian Shield");
    expect(shield.sp).toBe(8);
    expect(shield.slot).toBe("lArm");
  });

  it("getArmorForSlot returns leg armor for both leg slots", () => {
    const rLeg = getArmorForSlot("rLeg");
    const lLeg = getArmorForSlot("lLeg");
    expect(rLeg.some((a) => a.name === "Plate Greaves")).toBe(true);
    expect(lLeg.some((a) => a.name === "Plate Greaves")).toBe(true);
  });

  it("catalogToArmorPiece preserves SP and slot", () => {
    const piece = catalogToArmorPiece(armor("Gambeson"));
    expect(piece.sp).toBe(3);
    expect(piece.slot).toBe("torso");
  });
});

describe("rulebook gear — catalog search", () => {
  it("finds weapons by partial name", () => {
    const hits = searchCatalog(WEAPONS_CATALOG, "long sword");
    expect(hits.some((w) => w.name === "Iron Long Sword")).toBe(true);
  });
});
