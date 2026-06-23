# Witcher TRPG Rulebook (extracted text)

Machine-readable extract of the official *Witcher Pen & Paper RPG* core rulebook PDF.
Use this as the **source of truth** when updating `@wilmak/game-data` catalogs, skills, professions, and mechanics.

## Source

- PDF: `data/pdfcoffee.com_the-witcher-pen-amp-paper-rpg-pdf-free.pdf`
- Pages: 336
- Extracted with: `scripts/extract-rulebook.py`

## Layout

| Path | Purpose |
|------|---------|
| **`curated/`** | **Start here** — condensed reference (~25 KB) |
| `toc.md` | Full table of contents with page numbers |
| `chunks/` | Fixed 20-page slices — broad search fallback |
| `sections/` | One file per TOC entry — full raw extract |
| `manifest.json` | Machine index of chunks and sections |

### Curated files (`curated/`)

See `curated/README.md` for the file list. Regenerate with `scripts/curate-rulebook.py`.

## Re-extract

```bash
python3 -m venv /tmp/pdf-venv && /tmp/pdf-venv/bin/pip install pypdf -q
/tmp/pdf-venv/bin/python3 scripts/extract-rulebook.py
/tmp/pdf-venv/bin/python3 scripts/curate-rulebook.py
```

## App mapping (quick reference)

| Rulebook area | Typical `game-data` module |
|---------------|----------------------------|
| Races, Professions, Statistics, Skills | `src/gameOptions.ts`, `src/characterData.ts` |
| Weapons, Armor, Gear | `src/data/weapons.json`, `armor.json`, … |
| Magic (Spells, Signs, Invocations, Hexes, Rituals) | `src/data/magic.json` |
| Combat, Healing | future rules helpers |
| Crafting, Alchemy | future catalog / formulas |

> **Note:** PDF text extraction may have OCR/layout artifacts (hyphenation, columns). Prefer section files for rules text; verify critical stats against the PDF when in doubt.
