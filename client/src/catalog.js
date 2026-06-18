import weaponsCatalog from './data/catalog/weapons.json';
import armorCatalog from './data/catalog/armor.json';
import magicCatalog from './data/catalog/magic.json';

export const WEAPONS_CATALOG = weaponsCatalog;
export const ARMOR_CATALOG = armorCatalog;
export const MAGIC_CATALOG = magicCatalog;

function searchText(item) {
  return [
    item.id,
    item.name,
    item.effect,
    item.type,
    item.slot,
    item.category,
    item.dmg,
    item.hand,
    item.range,
    item.duration,
    ...(item.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function searchCatalog(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => searchText(item).includes(q));
}

export function catalogToWeapon(item) {
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

export function catalogToArmorPiece(item, slot) {
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

export function catalogToSpell(item, category) {
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

export function getArmorForSlot(slot) {
  return ARMOR_CATALOG.filter((a) => a.slot === slot);
}

export function getMagicForCategory(category) {
  return MAGIC_CATALOG.filter((m) => m.category === category);
}
