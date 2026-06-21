import weaponsCatalog from './data/weapons.json';
import armorCatalog from './data/armor.json';
import magicCatalog from './data/magic.json';

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
  range?: string;
  duration?: string;
  effect?: string;
  tags?: string[];
}

export type CatalogItem = CatalogWeapon | CatalogArmor | CatalogMagic;

export const WEAPONS_CATALOG: CatalogWeapon[] = weaponsCatalog as CatalogWeapon[];
export const ARMOR_CATALOG:   CatalogArmor[]  = armorCatalog   as CatalogArmor[];
export const MAGIC_CATALOG:   CatalogMagic[]  = magicCatalog   as CatalogMagic[];

function searchText(item: CatalogItem): string {
  const w = item as CatalogWeapon & CatalogArmor & CatalogMagic;
  return [
    item.id, item.name, w.effect, w.type, w.slot, w.category,
    w.dmg, w.hand, w.rng, w.range, w.duration,
    ...(item.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
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
    type: item.type ?? '',
    wa: item.wa ?? 0,
    dmg: item.dmg ?? '',
    rel: item.rel ?? '',
    hand: item.hand ?? '',
    rng: item.rng ?? '',
    effect: item.effect ?? '',
    conc: item.conc ?? '',
    enhancements: item.enhancements ?? '',
    weight: item.weight ?? 0,
    catalogId: item.id,
  };
}

export function catalogToArmorPiece(item: CatalogArmor, slot?: string) {
  return {
    slot: slot ?? item.slot,
    name: item.name,
    sp: item.sp ?? 0,
    damage: 0,
    effects: item.effects ?? '',
    weight: item.weight ?? 0,
    catalogId: item.id,
  };
}

export function catalogToSpell(item: CatalogMagic, category?: string) {
  return {
    id: crypto.randomUUID(),
    category: category ?? item.category,
    name: item.name,
    staCost: item.staCost ?? 0,
    range: item.range ?? '',
    duration: item.duration ?? '',
    effect: item.effect ?? '',
    catalogId: item.id,
  };
}

export function getArmorForSlot(slot: string): CatalogArmor[] {
  return ARMOR_CATALOG.filter((a) => a.slot === slot);
}

export function getMagicForCategory(category: string): CatalogMagic[] {
  return MAGIC_CATALOG.filter((m) => m.category === category);
}
