#!/usr/bin/env python3
"""Distill raw rulebook extracts into compact curated reference files."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "rulebook"
OUT = RAW / "curated"

RODOLF_RE = re.compile(
    r"Rodolf on .+?–Rodolf Kazmer",
    re.DOTALL | re.IGNORECASE,
)
RODOLF_QUOTE_RE = re.compile(
    r"–Rodolf Kazmer.*?(?=\n[A-Z]|\n## Page |\Z)",
    re.DOTALL,
)
PAGE_ONLY_RE = re.compile(r"^\d{1,3}$")


def read_section(name: str) -> str:
    path = RAW / "sections" / name
    if not path.exists():
        return ""
    text = path.read_text(encoding="utf-8")
    # Drop page headers from extract.
    text = re.sub(r"^## Page \d+\n+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^# .+\n+> Rulebook pages .+\n+> Source PDF:.+\n+", "", text)
    return text


def clean(text: str) -> str:
    text = RODOLF_RE.sub("", text)
    text = RODOLF_QUOTE_RE.sub("", text)
    lines: list[str] = []
    for line in text.splitlines():
        s = line.strip()
        if PAGE_ONLY_RE.match(s):
            continue
        if s.startswith("–") and "Kazmer" in s:
            continue
        lines.append(line.rstrip())
    text = "\n".join(lines)
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_table_block(text: str, start_marker: str, stop_markers: list[str]) -> str:
    idx = text.find(start_marker)
    if idx < 0:
        return ""
    chunk = text[idx:]
    for stop in stop_markers:
        stop_idx = chunk.find(stop, len(start_marker))
        if stop_idx > 0:
            chunk = chunk[:stop_idx]
    lines = [ln for ln in chunk.splitlines() if ln.strip()]
    return "\n".join(lines)


def write(name: str, body: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(body.rstrip() + "\n", encoding="utf-8")


def build_readme() -> str:
    return """# Witcher TRPG — Curated Rule Reference

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
"""


def build_character_creation() -> str:
    return """# Character Creation

## Playable races (4)

Human, Elf, Dwarf, Witcher. Witcher is both a **race** and a **profession** — you must take both.

Only **Human** or **Elf** can be Mage or Priest. Elves have no native priesthood; elven priests follow human deities.

## Social standing (strangers)

| Standing | Effect |
|----------|--------|
| Equal | No modifier |
| Feared | +1 Intimidation, −1 Charisma |
| Tolerated | −1 Seduction, Charisma, Persuasion, Leadership |
| Hated | −2 Seduction, Charisma, Persuasion, Leadership |

### By territory (Humans / Elves / Dwarves / Witchers / Mages)

| Territory | Humans | Elves | Dwarves | Witchers | Mages |
|-----------|--------|-------|---------|----------|-------|
| The North | Equal | Hated | Tolerated | Hated & Feared | Hated & Feared |
| Nilfgaard | Equal | Equal | Equal | Hated & Feared | Tolerated |
| Skellige | Equal | Equal | Equal | Tolerated | Tolerated |
| Dol Blathanna | Hated | Equal | Equal | Tolerated | Equal |
| Mahakam | Tolerated | Equal | Equal | Tolerated | Tolerated |

Same-race NPCs treat you as **Equal** unless they have a personal grudge. Friends and lovers override stranger reactions.

## Race perks

### Human
- **Trustworthy** — +1 Charisma, Seduction, Persuasion vs humans
- **Ingenuity** — +1 Deduction
- **Blindly Stubborn** — Reroll failed Resist Coercion or Courage up to 3×/session (higher roll); can’t reuse on same roll if still failing

### Elf
- **Artistic** — +1 Fine Arts
- **Marksman** — +2 Archery; draw/string bow without an action
- **Natural Attunement** — Beasts friendly unless provoked; auto-find common forage in local terrain

### Dwarf
- **Tough** — Natural SP 2 on skin (not reduced by weapons/ablation)
- **Strong** — +1 Physique; +25 Encumbrance
- **Crafter's Eye** — +1 Business

### Witcher (race)
- **Enhanced Senses** — No dim-light penalty; +1 Awareness; scent tracking
- **Resilient Mutation** — Immune to disease; can use mutagens
- **Dulled Emotions** — No Courage vs Intimidation; −4 EMP (min 1); EMP cap 6
- **Lightning Reflexes** — Permanent +1 REF and DEX (can exceed 10)

## Profession overview

Your profession sets defining skill, vigor (if magical), skill package (44 pts across 11 skills), starting gear, and magic perks. It does **not** cap non-profession skills long-term.

See `professions.md` for each profession.

## Lifepath (summary)

Use lifepath tables (p.25–30 in PDF) for background: family, homeland, life events, style. Not required for the digital sheet but useful for RP.

**PDF:** `sections/025-lifepath.md`, `sections/031-life-events-style.md`
"""


def build_statistics() -> str:
    return """# Statistics

## Core stats (9)

| Stat | Abbrev | Use |
|------|--------|-----|
| Intelligence | INT | Puzzles, science, deduction |
| Reflexes | REF | Combat, dodging, fast reactions |
| Dexterity | DEX | Ranged attacks, hand-eye coordination |
| Body | BODY | Strength, endurance, resist disease/fatigue |
| Speed | SPD | Movement, outrunning |
| Empathy | EMP | Emotion, seduction, persuasion |
| Craft | CRA | Machinery, precision crafting, artillery, traps |
| Will | WILL | Intimidation, magic checks, mental endurance |
| Luck | LUCK | Pool spent before rolls (+1 per point); refills each session |

## Point buy (campaign power level)

| Game type | Stat points |
|-----------|-------------|
| Average | 60 |
| Skilled | 70 |
| Heroes | 75 |
| Legends | 80 |

Alternative: roll 1d10 nine times (reroll 1–2), assign to stats.

## Stat level meaning

| Level | Meaning |
|-------|---------|
| 1–2 | Inept |
| 3–4 | Everyday |
| 5–6 | Competent |
| 7–8 | Heroic |
| 9–10 | Incredible |
| 11–12 | Legendary |
| 13 | Superheroic |

## Derived statistics

| Derived | Formula / rule |
|---------|----------------|
| HP, STA, REC, STun | From average of (BODY+WILL)/2 — see Physical Table |
| Run | SPD × 3 (meters per turn) |
| Leap | Run / 5 (meters, running start) |
| Encumbrance (ENC) | BODY × 10 kg; −1 REF/DEX/SPD per 5 kg over limit |
| Punch / Kick | From Body — see Hand To Hand Table |
| Melee bonus damage | By BODY when melee/thrown — see Hand To Hand Table |
| Vigor | By profession — max chaos channeled per round without overexertion |

Round **down** for all derived values.

### Physical Table — (BODY+WILL)/2 → HP, STA, REC, STUN

| Avg | HP | STA | REC | STUN |
|-----|-----|-----|-----|------|
| 2 | 10 | 10 | 2 | 20 |
| 3 | 15 | 15 | 3 | 30 |
| 4 | 20 | 20 | 4 | 40 |
| 5 | 25 | 25 | 5 | 50 |
| 6 | 30 | 30 | 6 | 60 |
| 7 | 35 | 35 | 7 | 70 |
| 8 | 40 | 40 | 8 | 80 |
| 9 | 45 | 45 | 9 | 90 |
| 10 | 50 | 50 | 10 | 100 |
| 11 | 55 | 55 | 11 | 110 |
| 12 | 60 | 60 | 12 | 120 |
| 13 | 65 | 65 | 13 | 130 |

### Hand To Hand — melee bonus & unarmed

| BODY | Melee bonus | Punch | Kick |
|------|-------------|-------|------|
| 1–2 | −4 | 1d6−4 | 1d6 |
| 3–4 | −2 | 1d6−2 | 1d6+2 |
| 5–6 | +0 | 1d6 | 1d6+4 |
| 7–8 | +2 | 1d6+2 | 1d6+6 |
| 9–10 | +4 | 1d6+4 | 1d6+8 |
| 11–12 | +6 | 1d6+6 | 1d6+10 |
| 13 | +8 | 1d6+8 | 1d6+12 |

## Skill checks

**Base** = relevant Stat + skill level. Roll d10 + base vs DC.

Home language: +8 in native language (Common Speech in the North; Elder Speech in Nilfgaard/Skellige/Dol Blathanna; Dwarven in Mahakam).
"""


def build_skills() -> str:
    return """# Skills

## Rules

- Skills range **0–10** (11–12+ only from racial/professional bonuses).
- At character creation: **max 6** per skill.
- **Profession package:** 44 points across 11 skills (package + defining skill); **min 1** in each package skill.
- **Pick-up skills:** INT + REF points; cannot raise profession package skills with pick-up points.
- Skills marked **(2)** cost **2 points per level**.

### Skill level meaning

| Level | Meaning |
|-------|---------|
| 1–2 | Inept |
| 3–4 | Everyday |
| 5–6 | Competent |
| 7–8 | Heroic |
| 9–10 | Incredible |
| 11–12 | Legendary |
| 13 | Superheroic |

## By attribute

### Intelligence
Awareness, Business, Deduction, Education, Language **(2)**, Monster Lore **(2)**, Social Etiquette, Streetwise, Tactics **(2)**, Teaching, Wilderness Survival

### Reflex
Brawling, Dodge/Escape, Melee, Riding, Sailing, Small Blades, Staff/Spear, Swordsmanship

### Dexterity
Archery, Athletics, Crossbow, Sleight of Hand, Stealth

### Body
Physique, Endurance

### Empathy
Charisma, Deceit, Fine Arts, Gambling, Grooming and Style, Human Perception, Leadership, Persuasion, Performance, Seduction

### Craft
Alchemy **(2)**, Crafting **(2)**, Disguise, First Aid, Forgery, Pick Lock, Trap Crafting **(2)**

### Will
Courage, Hex Weaving **(2)**, Intimidation, Spell Casting **(2)**, Resist Magic **(2)**, Resist Coercion, Ritual Crafting **(2)**

## Languages

Train via **Language (2)**. Options: Common Speech, Elder Speech, Dwarven. Dialects of Elder Speech are one language for simplicity (−2 when using wrong dialect, optional rule).

Full prose descriptions: `../sections/049-skills.md` (not needed for sheet data).
"""


def build_professions() -> str:
    return """# Professions

Each profession provides: **Defining Skill**, **Vigor**, **Skill Package** (11 skills, 44 pts), **Magical Perks**, **Starting Gear**.

| Profession | Defining skill | Vigor | Magic | Gear picks |
|------------|----------------|-------|-------|------------|
| Bard | Busking (EMP) | 0 | — | 5 |
| Craftsman | Patch Job (CRA) | 0 | — | 5 |
| Criminal | Practiced Paranoia (INT) | 0 | — | 5 |
| Doctor | Healing Hands (CRA) | 0 | — | 5 |
| Mage | Magic Training (INT) | 5 | 5 novice spells, 1 ritual, 1 hex | 5 |
| Man At Arms | Tough As Nails (BODY) | 0 | — | 5 |
| Merchant | Well Traveled (INT) | 0 | — | 3 (+ cart) |
| Priest | Initiate of the Gods (EMP) | 2 | 2 invocations, 2 rituals, 2 hexes | 5 |
| Witcher | Witcher Training (INT) | 2 | All basic signs | 2 |

## Bard
**Skills:** Charisma, Deceit, Performance, Language (1), Human Perception, Persuasion, Streetwise, Fine Arts, Seduction, Social Etiquette

## Craftsman
**Skills:** Crafting, Business, Athletics, Endurance, Physique, Streetwise, Fine Arts, Alchemy, Education, Persuasion

## Criminal
**Skills:** Sleight of Hand, Pick Lock, Streetwise, Forgery, Deceit, Stealth, Intimidation, Small Blades, Athletics, Awareness

## Doctor
**Skills:** Resist Coercion, Charisma, Social Etiquette, Courage, Human Perception, Wilderness Survival, Business, Deduction, Small Blades, Alchemy

## Mage
**Skills:** Human Perception, Spell Casting, Hex Weaving, Resist Magic, Staff/Spear, Education, Ritual Crafting, Social Etiquette, Seduction, Grooming & Style  
**Note:** Humans and elves only.

## Man At Arms
**Skills:** Any 5 combat skills (from Brawling, Dodge/Escape, Melee, Riding, Sailing, Small Blades, Staff/Spear, Swordsmanship, Archery, Athletics, Crossbow), Wilderness Survival, Courage, Physique, Intimidation, Dodge/Escape

## Merchant
**Skills:** Charisma, Small Blades, Education, Language (2), Streetwise, Business, Persuasion, Human Perception, Gambling, Resist Coercion  
**Special:** Cart with mule and 1000 crowns of common goods.

## Priest
**Skills:** Ritual Crafting, Leadership, Courage, Human Perception, Hex Weaving, First Aid, Charisma, Wilderness Survival, Teaching, Spell Casting  
**Note:** Humans and elves only.

## Witcher
**Skills:** Awareness, Deduction, Spell Casting, Alchemy, Dodge/Escape, Wilderness Survival, Swordsmanship, Athletics, Stealth, Riding  
**Special gear:** Medallion, steel sword, silver sword, 2 potion formulae, 2 oil formulae, decoction formulae.  
**Note:** Must take Witcher race. Witcher Training substitutes for Monster Lore and halves hostile terrain penalties.
"""


def build_magic() -> str:
    signs = read_section("114-witcher-signs.md")
    signs_clean = clean(signs)
    # Keep only sign blocks — trim after alternate signs if too long
    spells = read_section("101-mage-spells.md")
    spells_index = extract_table_block(
        spells,
        "novice_spells:",
        ["Spell Descriptions", "JOURNEYMAN", "## Page"],
    )
    if not spells_index:
        spells_index = extract_table_block(spells, "Novice Spells", ["Journeyman"])

    invocations = read_section("109-priest-invocations.md")
    inv_clean = clean(invocations)
    inv_index = inv_clean[:3500] if inv_clean else ""

    return f"""# Magic

## Core concepts

- Power source: **Primal Chaos** from four elemental planes (Earth, Air, Fire, Water).
- **Vigor** — safe chaos per round; exceeding it causes overexertion (element-specific backlash).
- Casting uses **STA**; armor **EV** also penalizes Spell Casting.
- Schools: **Aretuza** & **Ban Ard** (North), **Gweision Haul** (Nilfgaard).

### Element traits

| Element | Trait |
|---------|--------|
| Earth | Hard to summon; very efficient once channeled |
| Air | Easy access; hard to gather enough; needs intuition |
| Fire | Fast and destructive; hard to stop; overload risk |
| Water | Easiest to learn and control |

## Magic types by profession

| Type | Used by | Section in PDF |
|------|---------|----------------|
| Spells | Mage | p.101+ |
| Invocations | Priest | p.109+ |
| Signs | Witcher | p.114+ |
| Rituals | Mage, Priest, Druid* | p.116+ |
| Hexes | Mage, Priest | p.120+ |

*Druid is not a core-book profession; rituals appear in priest/mage lists.

## Witcher signs (summary)

STA per cast: variable, **max 7** per cast, must stay within Vigor.

### Basic signs
| Sign | Element | Range | Defense | Effect (short) |
|------|---------|-------|---------|----------------|
| Yrden | Mixed | 3m radius, 5 rds | — | Magic trap circle; SPD/REF penalty = STA spent |
| Quen | Earth | Self | — | Block failed dodge/block, STA times per round |
| Aard | Air | 2m cone | Dodge/Shield | Knockback; 10% prone +10%/STA |
| Igni | Fire | 2m cone | Dodge/Block/Shield | 1d6 dmg/STA; 50% ignite |
| Axii | Water | 8m | Resist Magic/Shield | Stun; can replace Persuasion (visible magic) |

### Alternate signs
Magic Trap, Active Shield, Aard Sweep, Fire Stream, Puppet — see full stats in `../sections/114-witcher-signs.md`.

## Mage spells — indexes

Spells are **Novice / Journeyman / Master**, grouped by element (Mixed, Earth, Air, Fire, Water).  
Each entry: STA Cost, Effect, Range, Duration, Defense.

### Novice (names only)

**Mixed:** Afan's Mirror, Blinding Dust, Dispel, Glamour, Magic Compass, Mind Manipulation, Summon Staff, Telepathy

**Earth:** Cenlly Graig, Codi Bywyd, Diagnostic Spell, Earthen Spike, Korath's Breath, Luthien's Quill, Magic Healing, Talfryn's Prison

**Air:** Adenydd, Air Pocket, Bronwyn's Gust, Freshen Air, Static Storm, Telekinesis, Urien's Shelter, Zephyr

**Fire:** Aenye, Carys' Hail, Brand of Fire, Cadfan's Grasp, Magic Flare, Raise Flames, Tanio Ilchar, Wave of Fire

**Water:** Control Water, Curse of Sedna, Dormyn's Fog, Downpour, Ice Slick, Puro Dwr, Rhewi

### Journeyman (names only)

**Mixed:** Eilhart's Technique, Illusion, Teleportation  
**Earth:** Elgan's Theory, Rhwystr Graig, Stammelford's Earthquake  
**Air:** Alzur's Thunder, Gwynt Troelli, Suffocate  
**Fire:** Demetia's Crest, Flaming Vortex, Seirff Haul  
**Water:** Surge Anialwch, Merigold's Hailstorm, Waves of the Naglfar

### Master (names only)

**Mixed:** Mental Command, Standing Portal  
**Earth:** Polymorphism, Transmutation  
**Air:** Dervish, Lightning Storm  
**Fire:** Fire From the Sky, Mirror Effect  
**Water:** Part Water, Tryferi Gaeaf

Full spell stat blocks: `../sections/101-mage-spells.md`.  
Invocations: `../sections/109-priest-invocations.md`.  
Hexes: `../sections/120-hexes.md`. Rituals: `../sections/116-rituals.md`.
"""


def build_gear_weapons() -> str:
    raw = clean(read_section("072-weapons.md"))
    # Tables: from "Name Type WA" through before "Weapon Descriptions"
    table = extract_table_block(
        raw,
        "Name Type WA Avail.",
        ["Weapon Descriptions", "Rodolf"],
    )
    glossary = extract_table_block(raw, "Weapon Effects", ["## Page", "Weapons\nName Type"])

    return f"""# Weapons

## Stat glossary

| Field | Meaning |
|-------|---------|
| Type | Damage type: Slashing (S), Piercing (P), Bludgeoning (B), Elemental (E) |
| WA | Weapon Accuracy — add to attack |
| Avail. | E=Everywhere, C=Common, P=Poor/regional, R=Rare |
| DMG | Damage dice |
| Rel. | Reliability — blocks before breaking |
| Hands | 1 or 2 hands (−3 if 2-hand weapon used one-handed) |
| RNG | Range (melee N/A or distance) |
| Effect | Special (see table below) |
| Conc. | Concealment: T=tiny, S=small, L=large, N/A=can't hide |
| EN | Enhancement slots for runes |
| Weight | kg |
| Cost | crowns |

## Common weapon effects

| Effect | Summary |
|--------|---------|
| Concealment | +2 to hide weapon |
| Bleeding (x) | Bleed chance % in parentheses |
| Armor Piercing | Half armor SP (Improved: ignores DR) |
| Stun (x) | Head/torso hit → Stun save at penalty |
| Meteorite | Full dmg vs vulnerable monsters; +5 stopping power |
| Long Reach | Hit targets up to 2m away |
| Focus (x) | Reduce spell STA cost by x |
| Greater Focus | +2 effective spell DC |
| Grappling | Grapple/trip in range |
| Slow Reload | 1 action to reload |
| Non-Lethal | No penalty for non-lethal dmg |
| Balanced | Crit wound roll 2d6+2 |
| Ablating | 1d6/2 SP damage to armor on penetrate |

## Item tables (core book)

```
{table}
```

Flavor descriptions omitted. For full text see `../sections/072-weapons.md`.
"""


def split_armor_tables(raw: str) -> dict[str, str]:
    """Split armor section into head/torso/leg/shield tables by repeated headers."""
    cleaned = clean(raw)
    header = "Name SP Avail. AE Effect EV Weight Price"
    parts = cleaned.split(header)
    tables: dict[str, str] = {}
    labels = ["head", "torso", "legs", "shields"]
    for i, part in enumerate(parts[1:], start=0):
        if i >= len(labels):
            break
        block = (header + part).strip()
        # Stop at flavor headings or next major section.
        for stop in ("Head Armor\nFolk", "Torso Armor", "Leg Armor", "Shields\nFull Cover", "Armor Descriptions"):
            idx = block.find(stop)
            if idx > 0:
                block = block[:idx].strip()
        # Remove stray section title lines at end.
        for title in ("Head Armor", "Torso Armor", "Leg Armor", "Shields"):
            block = re.sub(rf"\n{re.escape(title)}\s*$", "", block)
        tables[labels[i]] = block.strip()
    return tables


def build_gear_armor() -> str:
    raw = read_section("078-armor.md")
    tables = split_armor_tables(raw)
    blocks = "\n\n".join(
        f"### {name.title()}\n\n```\n{table}\n```"
        for name, table in tables.items()
        if table
    )

    return f"""# Armor

## Stat glossary

| Field | Meaning |
|-------|---------|
| SP | Stopping Power — subtract from damage (head / torso+arms / legs) |
| Avail. | E/C/P/R availability |
| AE | Enhancement/glyph slots |
| Effect | e.g. Restricted Vision, Full Cover |
| EV | Encumbrance Value — subtract from REF, DEX, **and Spell Casting** |
| Weight | kg |
| Price | crowns |

**Resistances:** Halve qualifying damage after SP is applied. Human armor usually needs enhancements; elderfolk armor may have innate resistances.

**Restricted Vision:** Visor down → narrow forward cone; removes witcher Awareness bonus and scent tracking.

**Full Cover (pavise):** Crouch behind shield; damage must exceed pavise SP; pavise loses 1 SP per damaging hit.

## Item tables (core book)

{blocks}

Elderfolk armory: `../sections/083-elderfolk-armory.md`.
"""


def build_combat() -> str:
    basics = clean(read_section("151-combat-basics.md"))
    healing = clean(read_section("173-healing.md"))
    # Take first ~2500 chars of each as essentials
    return f"""# Combat & Healing (essentials)

## Combat basics (condensed)

{basics[:2800]}

…truncated — full rules: `../sections/151-combat-basics.md`, `163-in-depth-combat.md`.

## Healing (condensed)

{healing[:2000]}

…truncated — full rules: `../sections/173-healing.md`.

## Related

- Critical wounds: `../sections/159-critical-wounds.md`
- Status effects: `../sections/161-effects.md`
- Magic in combat: `../sections/166-magic-resolution.md`
- Optional adrenaline: `../sections/175-adrenaline.md`
"""


def build_excluded() -> str:
    return """# Excluded from curated set

Intentionally omitted to keep references short. Full text in `../sections/` or `../chunks/`.

| Category | Why excluded | Raw location |
|----------|--------------|--------------|
| Introduction & Rodolf lore | Flavor, not mechanics | `004-introduction.md`, `010-recent-history.md` |
| Hero NPC stat blocks | Pregens, not rules | `012-hero-characters.md` … `019-letho-of-gulet.md` |
| World gazetteer | Setting, not sheet data | `178-world.md` … `209-*.md` |
| Game Master's Guide | GM-only | `210-game-masters-guide.md` … |
| Bestiary | Monster stats (future enemy feature) | `266-bestiary.md` … |
| Skill prose (base 10/13/16/20) | Redundant for data entry | middle of `049-skills.md` |
| Weapon/armor flavor paragraphs | Redundant with tables | after tables in gear sections |
| Crafting & alchemy detail | Not in app yet | `124-crafting.md` … `146-alchemical-formulae.md` |
| Skill trees | Advanced progression | `061-skill-trees.md` |
| Transportation, general gear lists | Low priority for v1 | `091-*.md`, `093-general-gear.md` |

Re-include a section in curated form when the app needs it (e.g. alchemy when consumables are tracked).
"""


def main() -> None:
    files = {
        "README.md": build_readme(),
        "character-creation.md": build_character_creation(),
        "statistics.md": build_statistics(),
        "skills.md": build_skills(),
        "professions.md": build_professions(),
        "magic.md": build_magic(),
        "gear-weapons.md": build_gear_weapons(),
        "gear-armor.md": build_gear_armor(),
        "combat.md": build_combat(),
        "excluded.md": build_excluded(),
    }
    for name, body in files.items():
        write(name, body)

    manifest = {
        "version": 1,
        "source": "data/pdfcoffee.com_the-witcher-pen-amp-paper-rpg-pdf-free.pdf",
        "files": list(files.keys()),
        "purpose": "Condensed rule reference for @wilmak/game-data and sheet helper",
    }
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )

    total_chars = sum(len(v) for v in files.values())
    raw_chars = sum(
        f.stat().st_size for f in (RAW / "sections").glob("*.md")
    )
    print(f"Wrote {len(files)} curated files to {OUT}")
    print(f"  Curated: ~{total_chars // 1024} KB")
    print(f"  Raw sections: ~{raw_chars // 1024} KB ({100 * total_chars / max(raw_chars, 1):.1f}% of raw)")


if __name__ == "__main__":
    main()
