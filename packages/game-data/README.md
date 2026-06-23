# @wilmak/game-data

Core Witcher TRPG rules data for the sheet helper. Sourced from `data/rulebook/curated/`.

## Regenerate catalogs

After updating curated rulebook files:

```bash
npm run sync:game-data
```

This writes `src/data/weapons.json`, `armor.json`, and `magic.json`.

## Modules

| File | Contents |
|------|----------|
| `characterData.ts` | 9 stats, skills, physical/hand-to-hand tables, derived stat helpers |
| `gameOptions.ts` | Races (4), occupations (9), magic categories |
| `professions.ts` | Profession skill packages |
| `catalog.ts` | Weapon/armor/magic pickers |
