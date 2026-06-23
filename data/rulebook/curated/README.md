# Witcher TRPG — Curated Rule Reference

Condensed from the core rulebook PDF extract. Use this folder as the **source of truth** for `@wilmak/game-data` and sheet mechanics.

## What’s included

| File | Contents |
|------|----------|
| `character-creation.md` | Races, social standing, creation rules |
| `statistics.md` | Stats, derived values, physical table |
| `skills.md` | Full skill list + point-buy rules |
| `professions.md` | All 9 professions (packages, vigor, magic) |
| `gear-weapons.md` | Weapon stat glossary + item tables (no lore) |
| `gear-armor.md` | Armor rules + item tables |
| `magic.md` | Magic system, signs, spell/invocation indexes |
| `combat.md` | Combat & healing essentials |
| `excluded.md` | What was dropped and where to find it |

## What’s excluded (see `excluded.md`)

World gazetteer, hero NPC writeups, GM guide, bestiary, long skill descriptions, Rodolf flavor text.

## Regenerate

```bash
/tmp/pdf-venv/bin/python3 scripts/extract-rulebook.py   # raw extract
/tmp/pdf-venv/bin/python3 scripts/curate-rulebook.py    # this distill step
```

Raw full text remains in `../sections/` and `../chunks/`.

## App sync

Catalog JSON and TypeScript rules live in `packages/game-data/`. Regenerate catalogs after curated changes:

```bash
npm run sync:game-data
```
