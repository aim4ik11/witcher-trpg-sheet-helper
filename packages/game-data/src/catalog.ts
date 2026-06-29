import type { Spell } from "@wilmak/shared";
import weaponsCatalog from "./data/weapons.json";
import armorCatalog from "./data/armor.json";
import magicCatalog from "./data/magic.json";
import itemsCatalog from "./data/items.json";

export interface CatalogWeapon {
  id: string;
  name: string;
  type?: string;
  wa?: number;
  dmg?: string;
  rel?: string;
  hand?: string;
  rng?: string;
  effect?: string;
  conc?: string;
  enhancements?: string;
  weight?: number;
  tags?: string[];
}

export interface CatalogArmor {
  id: string;
  name: string;
  slot: string;
  sp?: number;
  weight?: number;
  effects?: string;
  tags?: string[];
}

export interface CatalogMagic {
  id: string;
  name: string;
  category: string;
  staCost?: number;
  staCostText?: string;
  range?: string;
  duration?: string;
  effect?: string;
  defense?: string;
  element?: string;
  tier?: string;
  danger?: string;
  requirement?: string;
  preparationTime?: string;
  difficultyCheck?: string;
  components?: string;
  tags?: string[];
}

export interface CatalogInventoryItem {
  id: string;
  name: string;
  category: string;
  source?: string;
  weight?: number;
  cost?: number;
  effect?: string;
  rarity?: string;
  avail?: string;
  quantity?: string;
  forageDc?: string;
  location?: string;
  duration?: string;
  toxicity?: string;
  time?: string;
  tags?: string[];
}

export type CatalogItem = CatalogWeapon | CatalogArmor | CatalogMagic | CatalogInventoryItem;

export const WEAPONS_CATALOG: CatalogWeapon[] = weaponsCatalog as CatalogWeapon[];
export const ARMOR_CATALOG: CatalogArmor[] = armorCatalog as CatalogArmor[];
export const MAGIC_CATALOG: CatalogMagic[] = magicCatalog as CatalogMagic[];
export const ITEMS_CATALOG: CatalogInventoryItem[] = itemsCatalog as CatalogInventoryItem[];

function searchText(item: CatalogItem): string {
  const w = item as unknown as Record<string, unknown>;
  return [
    item.id,
    item.name,
    w.effect,
    w.type,
    w.slot,
    w.category,
    w.dmg,
    w.hand,
    w.rng,
    w.range,
    w.duration,
    w.defense,
    w.element,
    w.tier,
    w.staCostText,
    w.danger,
    w.components,
    w.source,
    w.rarity,
    w.avail,
    w.quantity,
    w.forageDc,
    w.location,
    w.toxicity,
    ...(item.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function searchCatalog<T extends CatalogItem>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => searchText(item).includes(q));
}

export function catalogToWeapon(item: CatalogWeapon) {
  return {
    id: crypto.randomUUID(),
    name: item.name,
    type: item.type ?? "",
    wa: item.wa ?? 0,
    dmg: item.dmg ?? "",
    rel: item.rel ?? "",
    hand: item.hand ?? "",
    rng: item.rng ?? "",
    effect: item.effect ?? "",
    conc: item.conc ?? "",
    enhancements: item.enhancements ?? "",
    weight: item.weight ?? 0,
    catalogId: item.id,
  };
}

export function evFromArmorTags(tags?: string[]): number {
  const tag = tags?.find((t) => /^ev-\d+$/i.test(t));
  if (!tag) return 0;
  return parseInt(tag.replace(/^ev-/i, ""), 10) || 0;
}

export function catalogToArmorPiece(item: CatalogArmor, slot?: string) {
  return {
    slot: slot ?? item.slot,
    name: item.name,
    sp: item.sp ?? 0,
    damage: 0,
    effects: item.effects ?? "",
    weight: item.weight ?? 0,
    ev: evFromArmorTags(item.tags),
    catalogId: item.id,
  };
}

export function catalogToSpell(item: CatalogMagic, category?: string) {
  const staCost = item.staCost ?? 0;
  const staCostText = item.staCostText || (staCost > 0 ? String(staCost) : "");
  const element = item.element as Spell["element"] | undefined;
  return {
    id: crypto.randomUUID(),
    category: category ?? item.category,
    name: item.name,
    staCost,
    staCostText,
    range: item.range ?? "",
    duration: item.duration ?? "",
    effect: item.effect ?? "",
    defense: item.defense ?? "",
    catalogId: item.id,
    element,
  };
}

export function catalogToInventoryItem(item: CatalogInventoryItem, qty = 1) {
  return {
    id: crypto.randomUUID(),
    qty,
    name: item.name,
    category: item.category,
    effect: item.effect ?? "",
    weight: item.weight ?? 0,
    cost: item.cost ?? 0,
    catalogId: item.id,
    source: item.source ?? "",
  };
}

export function getArmorForSlot(slot: string): CatalogArmor[] {
  if (slot === "rLeg" || slot === "lLeg") {
    return ARMOR_CATALOG.filter((a) => a.slot === "rLeg" || a.slot === "lLeg");
  }
  return ARMOR_CATALOG.filter((a) => a.slot === slot);
}

export function getMagicForCategory(category: string): CatalogMagic[] {
  return MAGIC_CATALOG.filter((m) => m.category === category);
}
