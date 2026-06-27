import type { Spell } from "@wilmak/shared";
import { MAGIC_CATALOG, type CatalogMagic } from "./catalog";
import { MAGIC_CATEGORIES } from "./gameOptions";

export interface SpellDetailField {
  label: string;
  value: string;
}

export interface SpellDetailView {
  name: string;
  category: string;
  categoryLabel: string;
  element?: string;
  elementLabel?: string;
  tier?: string;
  staDisplay: string;
  effect: string;
  stats: SpellDetailField[];
  extras: SpellDetailField[];
  tags: string[];
  isHomebrew: boolean;
}

function categoryLabel(category: string): string {
  return MAGIC_CATEGORIES[category]?.label ?? category;
}

function elementLabel(element?: string): string | undefined {
  if (!element) return undefined;
  return element.charAt(0).toUpperCase() + element.slice(1);
}

function staDisplay(spell: Spell, catalog?: CatalogMagic): string {
  const text = spell.staCostText || catalog?.staCostText;
  if (text?.trim()) return text.trim();
  const cost = spell.staCost ?? catalog?.staCost;
  if (cost != null && cost > 0) return String(cost);
  return "—";
}

function pickString(...values: (string | undefined)[]): string {
  for (const v of values) {
    if (v?.trim()) return v.trim();
  }
  return "—";
}

/** Merge sheet spell row with catalog entry for display. */
export function getSpellDetail(spell: Spell): SpellDetailView {
  const catalog = spell.catalogId
    ? MAGIC_CATALOG.find((m) => m.id === spell.catalogId)
    : MAGIC_CATALOG.find((m) => m.name === spell.name && m.category === (spell.category || "spell"));

  const category = spell.category || catalog?.category || "spell";
  const element = spell.element ?? (catalog?.element as Spell["element"] | undefined);
  const tags = catalog?.tags ?? [];

  const stats: SpellDetailField[] = [
    { label: "STA cost", value: staDisplay(spell, catalog) },
    { label: "Range", value: pickString(spell.range, catalog?.range) },
    { label: "Duration", value: pickString(spell.duration, catalog?.duration) },
    { label: "Defense", value: pickString(spell.defense, catalog?.defense) },
  ];

  const extras: SpellDetailField[] = [];
  if (catalog?.preparationTime) {
    extras.push({ label: "Preparation", value: catalog.preparationTime });
  }
  if (catalog?.difficultyCheck) {
    extras.push({ label: "Difficulty", value: catalog.difficultyCheck });
  }
  if (catalog?.components) {
    extras.push({ label: "Components", value: catalog.components });
  }
  if (catalog?.danger) {
    extras.push({ label: "Danger", value: catalog.danger });
  }
  if (catalog?.requirement) {
    extras.push({ label: "Requirement", value: catalog.requirement });
  }

  return {
    name: spell.name || catalog?.name || "—",
    category,
    categoryLabel: categoryLabel(category),
    element,
    elementLabel: elementLabel(element),
    tier: catalog?.tier,
    staDisplay: staDisplay(spell, catalog),
    effect: pickString(spell.effect, catalog?.effect),
    stats,
    extras,
    tags,
    isHomebrew: tags.includes("homebrew"),
  };
}
