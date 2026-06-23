#!/usr/bin/env python3
"""Generate @wilmak/game-data JSON catalogs from curated rulebook files."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CURATED = ROOT / "data" / "rulebook" / "curated"
SECTIONS = ROOT / "data" / "rulebook" / "sections"
OUT = ROOT / "packages" / "game-data" / "src" / "data"

WEAPON_ROW = re.compile(
    r"^(.+?)\s+"
    r"(S(?:/P)?|S/P/B|P(?:/B)?|P|B)\s+"
    r"([+-]\d+)\s+"
    r"([ECPR])\s+"
    r"([\d\w+\-]+)\s+"
    r"(\d+)\s+"
    r"(\d+|Body)\s+"
    r"(.+)$"
)

def parse_armor_tail(tail: str) -> tuple[str, int, float, int] | None:
    """Parse effect, EV, weight, price from the tail after AE."""
    parts = tail.split()
    if len(parts) < 3:
        return None
    try:
        price = int(parts[-1])
        weight = float(parts[-2])
        ev = int(parts[-3])
    except ValueError:
        return None
    rest = parts[:-3]
    if not rest:
        return "", ev, weight, price
    if len(rest) == 1 and rest[0].isdigit():
        return ("" if rest[0] == "0" else rest[0]), ev, weight, price
    if rest[-1].isdigit() and int(rest[-1]) <= 3:
        effect = " ".join(rest[:-1])
        return effect, ev, weight, price
    return " ".join(rest), ev, weight, price


def parse_armor_line(line: str) -> dict | None:
    m = re.match(r"^(.+?)\s+(\d+)\s+([ECPR])\s+(\d+)\s+(.+)$", line)
    if not m:
        return None
    name, sp, avail, ae, tail = m.groups()
    parsed = parse_armor_tail(tail)
    if not parsed:
        return None
    effect, ev, weight, price = parsed
    return {
        "name": name.strip(),
        "sp": int(sp),
        "avail": avail,
        "ae": ae,
        "effect": effect,
        "ev": ev,
        "weight": weight,
        "price": price,
    }


def parse_armor_block(block: str, slot: str) -> list[dict]:
    items: list[dict] = []
    seen: set[str] = set()
    for line in join_wrapped_lines(block):
        low = line.lower()
        if low.startswith("name sp") or low in SKIP_WEAPON_LINES:
            continue
        row = parse_armor_line(line)
        if not row:
            continue
        wid = slug_id(row["name"])
        if wid in seen:
            wid = f"{wid}-{slot}"
        seen.add(wid)
        items.append(
            {
                "id": wid,
                "name": row["name"],
                "slot": slot,
                "sp": row["sp"],
                "weight": row["weight"],
                "effects": row["effect"],
                "tags": [row["avail"].lower(), f"ae-{row['ae']}"],
            }
        )
    return items


SKIP_WEAPON_LINES = {
    "name type wa avail. dmg rel. hands rng effect conc. en weight cost",
    "name type avail. rel. effect conc. weight cost",
    "swords",
    "small blades",
    "axes",
    "bludgeons",
    "pole arms",
    "ammunition",
    "staves",
    "thrown weapons",
    "bows",
    "crossbows",
    "light armor",
    "medium armor",
    "heavy armor",
    "light shields",
    "medium shields",
    "heavy shields",
}

SKIP_ARMOR_PREFIXES = ("name sp avail.", "light armor", "medium armor", "heavy armor", "light shields", "medium shields", "heavy shields")


def slug_id(name: str) -> str:
    s = name.lower().replace("'", "").replace("'", "")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "item"


def join_wrapped_lines(block: str) -> list[str]:
    lines: list[str] = []
    buf = ""
    for raw in block.splitlines():
        line = raw.strip()
        if not line or line.startswith("```"):
            continue
        if line.lower() in SKIP_WEAPON_LINES or line.lower().startswith(SKIP_ARMOR_PREFIXES):
            continue
        if re.match(r"^[A-Z][a-z]+ (Armor|Blades|Arms|Weapons|Shields)$", line):
            continue
        # Continuation: previous field split across lines (no dice / SP at start).
        if buf and not re.match(r"^[A-Z\d]", line):
            buf = f"{buf} {line}"
            continue
        if buf:
            lines.append(buf)
        buf = line
    if buf:
        lines.append(buf)
    return lines


def parse_weapon_tail(tail: str) -> dict:
    parts = tail.split()
    hand = parts[0] if parts else ""
    rng = parts[1] if len(parts) > 1 else ""
    rest = parts[2:] if len(parts) > 2 else []
    effect_parts: list[str] = []
    conc = ""
    en = ""
    weight = 0.0
    cost = 0
    i = 0
    while i < len(rest):
        tok = rest[i]
        if tok in ("T", "S", "L", "N/A") and not conc:
            conc = tok
            i += 1
            continue
        if re.match(r"^\d+$", tok) and en == "" and conc:
            en = tok
            i += 1
            continue
        if re.match(r"^[\d.]+$", tok):
            if weight == 0:
                weight = float(tok)
            elif cost == 0:
                cost = int(float(tok))
            i += 1
            continue
        effect_parts.append(tok)
        i += 1
    return {
        "hand": hand,
        "rng": rng,
        "effect": " ".join(effect_parts),
        "conc": conc,
        "enhancements": en,
        "weight": weight,
        "tags": [],
    }


def parse_weapons() -> list[dict]:
    text = (CURATED / "gear-weapons.md").read_text(encoding="utf-8")
    m = re.search(r"```\n(.*?)```", text, re.DOTALL)
    if not m:
        return []
    weapons: list[dict] = []
    seen: set[str] = set()
    for line in join_wrapped_lines(m.group(1)):
        low = line.lower()
        if low.startswith("name type"):
            continue
        # Ammunition rows (no WA).
        ammo = re.match(
            r"^(.+?)\s+(S|P|B)\s+([ECPR])\s+(\d+)\s+(.+?)\s+([TSLN/A]+)\s+([\d.]+)\s+(\d+)$",
            line,
        )
        if ammo:
            name, typ, avail, rel, effect, conc, weight, cost = ammo.groups()
            wid = slug_id(name)
            if wid in seen:
                wid = f"{wid}-{typ.lower()}"
            seen.add(wid)
            weapons.append(
                {
                    "id": wid,
                    "name": name.strip(),
                    "type": typ,
                    "wa": 0,
                    "dmg": "",
                    "rel": rel,
                    "hand": "",
                    "rng": "",
                    "effect": effect.strip(),
                    "conc": conc,
                    "enhancements": "",
                    "weight": float(weight),
                    "tags": ["ammunition", avail.lower()],
                }
            )
            continue
        match = WEAPON_ROW.match(line)
        if not match:
            continue
        name, typ, wa, avail, dmg, rel, hand, tail = match.groups()
        extra = parse_weapon_tail(tail)
        wid = slug_id(name)
        if wid in seen:
            wid = f"{wid}-{len(weapons)}"
        seen.add(wid)
        weapons.append(
            {
                "id": wid,
                "name": name.strip(),
                "type": typ,
                "wa": int(wa),
                "dmg": dmg,
                "rel": rel,
                "hand": hand,
                "rng": extra["rng"] if extra["rng"] != "N/A" else "",
                "effect": extra["effect"],
                "conc": extra["conc"],
                "enhancements": extra["enhancements"],
                "weight": extra["weight"],
                "tags": [avail.lower()],
            }
        )
    return weapons


def parse_armor() -> list[dict]:
    text = (CURATED / "gear-armor.md").read_text(encoding="utf-8")
    armor: list[dict] = []
    slot_map = {
        "### Head\n\n```": "head",
        "### Torso\n\n```": "torso",
        "### Legs\n\n```": "rLeg",
        "### Shields\n\n```": "lArm",
    }
    for marker, slot in slot_map.items():
        idx = text.find(marker)
        if idx < 0:
            continue
        start = idx + len(marker)
        end = text.find("```", start)
        block = text[start:end]
        armor.extend(parse_armor_block(block, slot))
        if slot == "rLeg":
            armor.extend(parse_armor_block(block, "lLeg"))
    return armor


def clean_section_text(text: str) -> str:
    text = re.sub(r"^## Page \d+\n+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^# .+\n+> Rulebook pages .+\n+> Source PDF:.+\n+", "", text)
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    return text


def parse_sta_cost(sta: str) -> tuple[int, str]:
    s = sta.strip()
    m = re.match(r"^(\d+)", s)
    if m:
        num = int(m.group(1))
        return num, s if s != m.group(1) else ""
    return 0, s


def split_name_element(name: str) -> tuple[str, str]:
    m = re.match(r"^(.+?) \(([^)]+)\)$", name.strip())
    if m:
        return m.group(1).strip(), m.group(2).lower().replace(" ", "-")
    return name.strip(), ""


def clean_field(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


SKIP_MAGIC_NAMES = {
    "Earth", "Air", "Fire", "Water", "Mixed Element", "Novice Spells", "Journeyman Spells",
    "Master Spells", "Novice Rituals", "Journeyman Rituals", "Master Rituals",
    "Novice Druid Invocations", "Journeyman Druid Invocations", "Master Druid Invocations",
    "Novice Preacher Invocations", "Journeyman Preacher Invocations", "Master Preacher Invocations",
    "Arch Priest Invocation", "Arch Priests", "Earth Spells", "Air Spells", "Fire Spells", "Water Spells",
    "Alternate Components", "Components", "Forbidden", "Rituals", "Hexes", "Basic Signs",
    "Alternate Sign Forms", "Skelligers In A", "Storm", "Preachers", "Mages Learning",
    "Invocations", "Deity Invocation", "How To Lift a Hex", "Ritual Books",
}


def is_plausible_magic_name(name: str) -> bool:
    n = name.strip()
    if not n or n in SKIP_MAGIC_NAMES:
        return False
    if len(n) > 50 or len(n) < 2:
        return False
    if re.search(r"\b(Spells|Invocations|Rituals?|Element|Priests?|Druids?)\b", n):
        return False
    if not re.match(r"^[A-Z0-9'\"]", n):
        return False
    if n.endswith(".") or "–" in n or "Rodolf" in n:
        return False
    return True


STANDARD_MAGIC_BLOCK = re.compile(
    r"^(?P<name>[^\n]+)\n"
    r"STA Cost: (?P<sta>[^\n]+)\n"
    r"Effect: (?P<effect>.+?)\n"
    r"Range: (?P<range>[^\n]+)\n"
    r"Duration: (?P<duration>[^\n]+)\n"
    r"Defense: (?P<defense>.+?)(?=\n[A-Z0-9'\"(]|\Z)",
    re.MULTILINE | re.DOTALL,
)

RITUAL_BLOCK = re.compile(
    r"^(?P<name>[^\n]+)\n"
    r"STA Cost: (?P<sta>[^\n]+)\n"
    r"Effect: (?P<effect>.+?)\n"
    r"Preparation Time: (?P<preptime>[^\n]+)\n"
    r"Difficulty Check: (?P<dc>[^\n]+)\n"
    r"Duration: (?P<duration>[^\n]+)\n"
    r"Components: (?P<components>.+?)(?=\n[A-Z][^\n]{2,40}\nSTA Cost:|\n## Page |\Z)",
    re.MULTILINE | re.DOTALL,
)

HEX_BLOCK = re.compile(
    r"^(?P<name>The [^\n]+)\n"
    r"STA Cost: (?P<sta>[^\n]+)\n"
    r"Effect: (?P<effect>.+?)\n"
    r"Danger: (?P<danger>[^\n]+)\n"
    r"Requirement To Lift: (?P<requirement>.+?)(?=\nThe [A-Z]|\nHow To |\n## Page |\Z)",
    re.MULTILINE | re.DOTALL,
)

TIER_HEADER = re.compile(
    r"(Novice|Journeyman|Master|Arch Priest)"
    r"(?:\s+(Druid|Preacher))?\s*(?:Spells|Invocations?|Rituals?)",
    re.IGNORECASE,
)
ELEMENT_HEADER = re.compile(r"^(Mixed Element|Earth(?:\s+Spells)?|Air|Fire|Water)\s*$", re.IGNORECASE)


def scan_context(segment: str) -> tuple[str, str, list[str]]:
    tier = ""
    element = ""
    extra_tags: list[str] = []
    for line in segment.splitlines():
        s = line.strip()
        tm = TIER_HEADER.search(s)
        if tm:
            tier = tm.group(1).lower().replace(" ", "-")
            if tm.group(2):
                extra_tags.append(tm.group(2).lower())
        em = ELEMENT_HEADER.match(s)
        if em:
            element = em.group(1).lower().replace(" element", "").replace(" spells", "")
            element = element.replace(" ", "-")
    return tier, element, extra_tags


def magic_entry(
    name: str,
    category: str,
    sta: str,
    effect: str,
    *,
    range_: str = "",
    duration: str = "",
    defense: str = "",
    element: str = "",
    tier: str = "",
    tags: list[str] | None = None,
    **extra: str,
) -> dict:
    sta_num, sta_text = parse_sta_cost(sta)
    prefix = {"spell": "spell", "sign": "sign", "invocation": "invocation", "ritual": "ritual", "hex": "hex"}[category]
    entry: dict = {
        "id": f"{prefix}-{slug_id(name)}",
        "name": name,
        "category": category,
        "staCost": sta_num,
        "range": clean_field(range_),
        "duration": clean_field(duration),
        "effect": clean_field(effect),
        "defense": clean_field(defense),
        "tags": list(tags or []),
    }
    if sta_text:
        entry["staCostText"] = sta_text
    if element:
        entry["element"] = element
    if tier:
        entry["tier"] = tier
    entry.update({k: clean_field(v) for k, v in extra.items() if v})
    return entry


def parse_standard_blocks(text: str, category: str) -> list[dict]:
    results: list[dict] = []
    pos = 0
    tier = ""
    element = ""
    extra_tags: list[str] = []
    for m in STANDARD_MAGIC_BLOCK.finditer(text):
        t, e, tags = scan_context(text[pos : m.start()])
        if t:
            tier = t
        if e:
            element = e
        if tags:
            extra_tags = tags
        pos = m.end()

        name_raw = m.group("name").strip()
        if not is_plausible_magic_name(name_raw):
            continue
        name, name_el = split_name_element(name_raw)
        el = name_el or element
        tag_list = [tier, el, *extra_tags]
        tag_list = [t for t in tag_list if t]
        results.append(
            magic_entry(
                name,
                category,
                m.group("sta"),
                m.group("effect"),
                range_=m.group("range"),
                duration=m.group("duration"),
                defense=m.group("defense"),
                element=el,
                tier=tier,
                tags=tag_list,
            )
        )
    return results


def parse_ritual_blocks(text: str) -> list[dict]:
    results: list[dict] = []
    pos = 0
    tier = ""
    for m in RITUAL_BLOCK.finditer(text):
        t, _, _ = scan_context(text[pos : m.start()])
        if t:
            tier = t
        pos = m.end()
        name = m.group("name").strip()
        if not is_plausible_magic_name(name):
            continue
        results.append(
            magic_entry(
                name,
                "ritual",
                m.group("sta"),
                m.group("effect"),
                duration=m.group("duration"),
                tier=tier,
                tags=[tier] if tier else [],
                preparationTime=m.group("preptime"),
                difficultyCheck=m.group("dc"),
                components=clean_field(m.group("components")),
            )
        )
    return results


def parse_hex_blocks(text: str) -> list[dict]:
    results: list[dict] = []
    for m in HEX_BLOCK.finditer(text):
        name = m.group("name").strip()
        results.append(
            magic_entry(
                name,
                "hex",
                m.group("sta"),
                m.group("effect"),
                tags=[],
                danger=m.group("danger"),
                requirement=clean_field(m.group("requirement")),
            )
        )
    return results


def parse_signs() -> list[dict]:
    text = clean_section_text((SECTIONS / "114-witcher-signs.md").read_text(encoding="utf-8"))
    entries = parse_standard_blocks(text, "sign")
    for e in entries:
        e["tags"] = [*e.get("tags", []), "witcher"]
    return entries


def parse_mage_spells() -> list[dict]:
    text = clean_section_text((SECTIONS / "101-mage-spells.md").read_text(encoding="utf-8"))
    return parse_standard_blocks(text, "spell")


def parse_invocations() -> list[dict]:
    text = clean_section_text((SECTIONS / "109-priest-invocations.md").read_text(encoding="utf-8"))
    entries = parse_standard_blocks(text, "invocation")
    for e in entries:
        if "arch-priest" in e.get("tier", "") or e.get("staCost", 0) >= 16:
            e.setdefault("tier", "arch-priest")
            if "arch-priest" not in e.get("tags", []):
                e["tags"] = [*e.get("tags", []), "arch-priest"]
    return entries


def parse_rituals() -> list[dict]:
    text = clean_section_text((SECTIONS / "116-rituals.md").read_text(encoding="utf-8"))
    return parse_ritual_blocks(text)


def parse_hexes() -> list[dict]:
    text = clean_section_text((SECTIONS / "120-hexes.md").read_text(encoding="utf-8"))
    return parse_hex_blocks(text)


def merge_magic_entries(entries: list[dict]) -> list[dict]:
    by_id: dict[str, dict] = {}
    for e in entries:
        eid = e["id"]
        if eid not in by_id:
            by_id[eid] = e
            continue
        prev = by_id[eid]
        score = len(e.get("effect", "")) + (10 if e.get("staCost") else 0)
        prev_score = len(prev.get("effect", "")) + (10 if prev.get("staCost") else 0)
        if score >= prev_score:
            by_id[eid] = {**prev, **e}
    return sorted(by_id.values(), key=lambda x: (x["category"], x.get("tier", ""), x["name"]))


def parse_magic() -> list[dict]:
    return merge_magic_entries(
        parse_signs()
        + parse_mage_spells()
        + parse_invocations()
        + parse_rituals()
        + parse_hexes()
    )


STAT_KEYS = (
    "INT", "REF", "DEX", "BODY", "SPD", "EMP", "CRA", "WILL", "LUCK",
    "STUN", "RUN", "LEAP", "STA", "ENC", "REC", "HP", "VIGOR",
)

SKILL_LABEL_MAP: dict[str, tuple[str, str]] = {
    "swordsmanship": ("ref", "swordsmanship"),
    "melee": ("ref", "melee"),
    "brawling": ("ref", "brawling"),
    "dodge/escape": ("ref", "dodgeEscape"),
    "small blades": ("ref", "smallBlades"),
    "staff/spear": ("ref", "staffSpear"),
    "riding": ("ref", "riding"),
    "sailing": ("ref", "sailing"),
    "archery": ("dex", "archery"),
    "crossbow": ("dex", "crossbow"),
    "athletics": ("dex", "athletics"),
    "stealth": ("dex", "stealth"),
    "sleight of hand": ("dex", "sleightOfHand"),
    "awareness": ("int", "awareness"),
    "wild. survival": ("int", "wildernessSurv"),
    "wilderness survival": ("int", "wildernessSurv"),
    "education": ("int", "education"),
    "deduction": ("int", "deduction"),
    "streetwise": ("int", "streetwise"),
    "tactics": ("int", "tactics"),
    "physique": ("body", "physique"),
    "endurance": ("body", "endurance"),
    "charisma": ("emp", "charisma"),
    "deceit": ("emp", "deceit"),
    "persuasion": ("emp", "persuasion"),
    "intimidation": ("will", "intimidation"),
    "courage": ("will", "courage"),
    "resist magic": ("will", "resistMagic"),
    "resist coercion": ("will", "resistCoercion"),
    "spell casting": ("will", "spellCasting"),
    "alchemy": ("cra", "alchemy"),
    "first aid": ("cra", "firstAid"),
    "crafting": ("cra", "crafting"),
}

BESTIARY_ENTRIES: list[dict] = [
    {"file": "270-bandits.md", "id": "bandits", "name": "Bandits", "kind": "npc", "monsterType": "Humanoid", "race": "Human"},
    {"file": "272-mages.md", "id": "mages", "name": "Mages", "kind": "npc", "monsterType": "Humanoid", "race": "Human"},
    {"file": "274-scoiatael-archers.md", "id": "scoiatael-archers", "name": "Scoia'tael Archers", "kind": "npc", "monsterType": "Humanoid", "race": "Elf"},
    {"file": "276-drowners.md", "id": "drowners", "name": "Drowners", "kind": "monster", "monsterType": "Necrophage"},
    {"file": "278-ghouls.md", "id": "ghouls", "name": "Ghouls", "kind": "monster", "monsterType": "Necrophage"},
    {"file": "280-grave-hags.md", "id": "grave-hags", "name": "Grave Hags", "kind": "monster", "monsterType": "Necrophage"},
    {"file": "282-wraiths.md", "id": "wraiths", "name": "Wraiths", "kind": "monster", "monsterType": "Specter"},
    {"file": "284-noon-wraiths.md", "id": "noon-wraiths", "name": "Noon Wraiths", "kind": "monster", "monsterType": "Specter"},
    {"file": "286-wolves-wargs.md", "id": "wolf", "name": "Wolf", "kind": "monster", "monsterType": "Beast", "until": "\nWargs\nINT"},
    {"file": "286-wolves-wargs.md", "id": "warg", "name": "Warg", "kind": "monster", "monsterType": "Beast", "marker": "Wargs\nINT"},
    {"file": "288-werewolves.md", "id": "werewolves", "name": "Werewolves", "kind": "monster", "monsterType": "Cursed One"},
    {"file": "290-sirens.md", "id": "sirens", "name": "Sirens", "kind": "monster", "monsterType": "Hybrid"},
    {"file": "292-griffins.md", "id": "griffins", "name": "Griffins", "kind": "monster", "monsterType": "Hybrid"},
    {"file": "294-endrega.md", "id": "endrega", "name": "Endrega", "kind": "monster", "monsterType": "Insectoid"},
    {"file": "296-arachasae.md", "id": "arachasae", "name": "Arachasae", "kind": "monster", "monsterType": "Insectoid"},
    {"file": "298-golems.md", "id": "golems", "name": "Golems", "kind": "monster", "monsterType": "Elementa"},
    {"file": "300-fiends.md", "id": "fiends", "name": "Fiends", "kind": "monster", "monsterType": "Relict"},
    {"file": "302-nekkers.md", "id": "nekkers", "name": "Nekkers", "kind": "monster", "monsterType": "Ogroid", "until": "\nNekker Chieftain\nINT"},
    {"file": "302-nekkers.md", "id": "nekker-chieftain", "name": "Nekker Chieftain", "kind": "monster", "monsterType": "Ogroid", "marker": "Nekker Chieftain\nINT"},
    {"file": "304-rock-trolls.md", "id": "rock-trolls", "name": "Rock Trolls", "kind": "monster", "monsterType": "Ogroid"},
    {"file": "306-wyverns.md", "id": "wyverns", "name": "Wyverns", "kind": "monster", "monsterType": "Draconid"},
    {"file": "308-katakans.md", "id": "katakans", "name": "Katakans", "kind": "monster", "monsterType": "Vampire"},
    {"file": "310-cats-dogs.md", "id": "cat", "name": "Cat", "kind": "monster", "monsterType": "Beast", "marker": "Cat\nSkills", "until": "\nDog\nSkills"},
    {"file": "310-cats-dogs.md", "id": "dog", "name": "Dog", "kind": "monster", "monsterType": "Beast", "marker": "Dog\nSkills"},
    {"file": "311-birds-serpents.md", "id": "bird", "name": "Bird", "kind": "monster", "monsterType": "Beast", "marker": "Bird\nSkills", "until": "\nSerpent\nSkills"},
    {"file": "311-birds-serpents.md", "id": "serpent", "name": "Serpent", "kind": "monster", "monsterType": "Beast", "marker": "Serpent\nSkills"},
    {"file": "312-horses-war-horses.md", "id": "horse", "name": "Horse", "kind": "monster", "monsterType": "Beast", "marker": "Horse\nSkills", "until": "\nWar Horse\nSkills"},
    {"file": "312-horses-war-horses.md", "id": "war-horse", "name": "War Horse", "kind": "monster", "monsterType": "Beast", "marker": "War Horse\nSkills"},
    {"file": "313-oxen-mules.md", "id": "ox", "name": "Ox", "kind": "monster", "monsterType": "Beast", "marker": "Ox\nSkills", "until": "\nMule\nSkills"},
    {"file": "313-oxen-mules.md", "id": "mule", "name": "Mule", "kind": "monster", "monsterType": "Beast", "marker": "Mule\nSkills"},
]


THREAT_WORDS = frozenset({"Easy", "Medium", "Hard", "Simple", "Complex", "Difficult"})
DMG_TOKEN_RE = re.compile(r"^\d+d\d+(?:/\d+)?(?:[+-]\d+)?$")
ROF_TOKEN_RE = re.compile(r"^\d+$")


BESTIARY_PAGE_MIN = 266
BESTIARY_PAGE_MAX = 314


def _find_lore_start(region: str) -> int | None:
    """Find rulebook page break (e.g. 281) without matching bounty values like 500."""
    for m in re.finditer(r"^(\d{3})$", region, re.MULTILINE):
        page = int(m.group(1))
        if BESTIARY_PAGE_MIN <= page <= BESTIARY_PAGE_MAX:
            return m.start()
    return None


def _uses_last_stat_block(cfg: dict) -> bool:
    return "Skills" in cfg.get("marker", "")


def _stat_block_starts(text: str) -> list[int]:
    return [m.start() for m in re.finditer(r"^INT\s+(?:\d+|-)", text, re.MULTILINE)]


def _find_section_line(text: str, header: str) -> re.Match[str] | None:
    """Match a standalone section header line (case-sensitive; avoids Vulnerabilities → abilities)."""
    return re.search(rf"^(?:[A-Za-z'’ ]+ )?{re.escape(header)}\s*$", text, re.MULTILINE)


def _header_region(text: str, cfg: dict) -> str:
    starts = _stat_block_starts(text)
    if not starts:
        return text
    use_last = _uses_last_stat_block(cfg)
    start = starts[-1] if use_last else starts[0]
    if not use_last:
        meta = re.search(r"^(?:Height|INT)\s", text, re.MULTILINE)
        if meta:
            start = meta.start()
    region = text[start:]
    if _uses_last_stat_block(cfg):
        armor = re.search(r"^Armor\s*\n\d+", region, re.MULTILINE)
        if armor:
            return region[: armor.end()]
        return region
    lore_at = _find_lore_start(region)
    if lore_at is not None:
        return region[:lore_at]
    return region


def _tactical_text(text: str, cfg: dict) -> str:
    if _uses_last_stat_block(cfg):
        return text
    starts = _stat_block_starts(text)
    sub = text[starts[0] :] if starts else text
    hit: int | None = None
    for hdr in ("Vulnerabilities", "Weapons", "Weap ons", "Loot", "Skills"):
        m = _find_section_line(sub, hdr)
        if m and (hit is None or m.start() < hit):
            hit = m.start()
    return sub[hit:] if hit is not None else sub


def _stat_int(text: str, key: str) -> int | None:
    m = re.search(rf"^{re.escape(key)}\s+(-|\d+)", text, re.MULTILINE)
    if not m or m.group(1) == "-":
        return None
    return int(m.group(1))


def _meta_line(text: str, field: str) -> str:
    m = re.search(rf"^{re.escape(field)}\s*(.+)$", text, re.MULTILINE)
    return m.group(1).strip() if m else ""


SECTION_HEADERS = (
    "Skills", "Weapons", "Weap ons", "Abilities", "Loot", "Vulnerabilities",
)

STAT_LINE = re.compile(
    r"^(INT|REF|DEX|BODY|SPD|EMP|CRA|WILL|LUCK|STUN|RUN|LEAP|STA|ENC|REC|HP|VIGOR)\s+",
    re.MULTILINE,
)


def _section_end(rest: str, header: str) -> int:
    end = len(rest)
    for h in SECTION_HEADERS:
        if h == header:
            continue
        hm = _find_section_line(rest, h)
        if hm and hm.start() < end:
            end = hm.start()
    sm = STAT_LINE.search(rest)
    if sm and sm.start() < end:
        end = sm.start()
    # prose blocks that follow skills on shared pages (wolf/warg)
    for marker in (
        r"^While there are",
        r"^Knowledge of ",
        r"^Wargs are ",
        r"^Nekker chieftains ",
    ):
        pm = re.search(marker, rest, re.MULTILINE)
        if pm and pm.start() < end:
            end = pm.start()
    return end


def _extract_block(text: str, header: str) -> str:
    m = _find_section_line(text, header)
    if not m:
        return ""
    rest = text[m.end() :]
    return rest[: _section_end(rest, header)].strip()


def _parse_threat(text: str) -> str:
    m = re.search(
        r"^Threat\s*\n(.+?)(?=\n(?:Bounty|Armor|Height|Weight|Environment|Intelligence|Organization|INT |STUN |\Z))",
        text,
        re.MULTILINE | re.DOTALL,
    )
    if not m:
        return ""
    parts = [p.strip() for p in re.split(r"\s*\n\s*", m.group(1).strip()) if p.strip()]
    parts = [p for p in parts if p in THREAT_WORDS]
    return " / ".join(parts)


def _parse_skills(text: str) -> list[dict]:
    block = _extract_block(text, "Skills")
    if not block:
        return []
    flat = re.sub(r"\s+", " ", block)
    skills: list[dict] = []
    for m in re.finditer(r"([A-Za-z./ ]+?)\s*\+(\d+)", flat):
        label = m.group(1).strip().lower()
        level = int(m.group(2))
        mapped = SKILL_LABEL_MAP.get(label)
        if not mapped:
            continue
        attr, key = mapped
        skills.append({"attr": attr, "key": key, "label": m.group(1).strip(), "level": level})
    return skills


def _line_has_dmg(line: str) -> bool:
    return any(DMG_TOKEN_RE.match(part) for part in line.split())


def _join_weapon_lines(raw: str) -> list[str]:
    rows: list[str] = []
    buf = ""
    for raw_line in raw.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if ROF_TOKEN_RE.match(line):
            if buf:
                rows.append(f"{buf} {line}")
                buf = ""
            continue
        if buf and _line_has_dmg(buf) and not _line_has_dmg(line):
            buf = f"{buf} {line}"
            continue
        if buf:
            rows.append(buf)
        buf = line
    if buf:
        rows.append(buf)
    return rows


def _parse_weapon_line(line: str) -> dict | None:
    parts = line.split()
    if len(parts) < 3:
        return None
    rof = parts[-1]
    if not ROF_TOKEN_RE.match(rof):
        return None
    rest = parts[:-1]
    dmg_i = next((i for i, p in enumerate(rest) if DMG_TOKEN_RE.match(p)), None)
    if dmg_i is None:
        return None
    name = " ".join(rest[:dmg_i]).strip()
    dmg = rest[dmg_i]
    effect_parts = rest[dmg_i + 1 :]
    rng = ""
    if effect_parts and effect_parts[0] == "RNG:":
        rng = f"RNG: {effect_parts[1]}" if len(effect_parts) > 1 else "RNG:"
        effect_parts = effect_parts[2:]
    effect = " ".join(effect_parts).strip() or "N/A"
    return {"name": name, "dmg": dmg, "effect": effect, "rof": rof, "rng": rng}


def _parse_monster_weapons(text: str) -> list[dict]:
    m = re.search(
        r"(?:Weapons|Weap ons)\s*\nName DMG Effect ROF\s*\n(.+)",
        text,
        re.DOTALL,
    )
    if not m:
        return []
    raw = m.group(1)
    cut = _section_end(raw, "Weapons")
    raw = raw[:cut]
    weapons: list[dict] = []
    for line in _join_weapon_lines(raw):
        row = _parse_weapon_line(line)
        if row:
            weapons.append(row)
    return weapons


def _slice_entry_text(full: str, cfg: dict) -> str:
    text = full
    if cfg.get("marker"):
        idx = text.find(cfg["marker"])
        if idx < 0:
            return ""
        text = text[idx:]
    if cfg.get("until"):
        end = text.find(cfg["until"])
        if end > 0 and (not cfg.get("marker") or end > len(cfg["marker"])):
            text = text[:end]
    return text


def _parse_bestiary_entry(full_text: str, cfg: dict) -> dict | None:
    text = _slice_entry_text(full_text, cfg)
    if not text.strip():
        return None

    header = _header_region(text, cfg)
    tactical = _tactical_text(text, cfg)

    attrs: dict[str, int] = {}
    for key in STAT_KEYS[:9]:
        val = _stat_int(header, key)
        if val is not None:
            attrs[key.lower()] = val

    combat: dict[str, int] = {}
    for key in STAT_KEYS[9:]:
        val = _stat_int(header, key)
        if val is not None:
            combat[key.lower()] = val

    bounty = _stat_int(header, "Bounty")
    if bounty is None:
        m = re.search(r"^Bounty\s*\n(\d+)", header, re.MULTILINE)
        bounty = int(m.group(1)) if m else None

    armor = _stat_int(header, "Armor")
    if armor is None:
        m = re.search(r"^Armor\s*\n(\d+)", header, re.MULTILINE)
        armor = int(m.group(1)) if m else 0

    return {
        "id": cfg["id"],
        "name": cfg["name"],
        "kind": cfg["kind"],
        "monsterType": cfg["monsterType"],
        "defaultRace": cfg.get("race", ""),
        "threat": _parse_threat(header),
        "bounty": bounty,
        "naturalArmor": armor or 0,
        "height": _meta_line(header, "Height"),
        "weight": _meta_line(header, "Weight"),
        "environment": _meta_line(header, "Environment"),
        "intelligence": _meta_line(header, "Intelligence"),
        "organization": _meta_line(header, "Organization"),
        "attributes": attrs,
        "combat": combat,
        "skills": _parse_skills(tactical),
        "weapons": _parse_monster_weapons(tactical),
        "abilities": _extract_block(tactical, "Abilities"),
        "vulnerabilities": _extract_block(tactical, "Vulnerabilities"),
        "loot": _extract_block(tactical, "Loot"),
    }


def _validate_bestiary(entries: list[dict]) -> list[str]:
    warnings: list[str] = []
    for e in entries:
        eid = e["id"]
        if len(e.get("attributes", {})) < 9:
            warnings.append(f"{eid}: incomplete attributes")
        if not e.get("combat", {}).get("hp"):
            warnings.append(f"{eid}: missing HP")
        threat = e.get("threat") or ""
        if threat and not all(p.strip() in THREAT_WORDS for p in threat.split("/")):
            warnings.append(f"{eid}: suspicious threat {threat!r}")
        ab = e.get("abilities") or ""
        vu = e.get("vulnerabilities") or ""
        if ab and vu and ab[:40] == vu[:40]:
            warnings.append(f"{eid}: abilities duplicates vulnerabilities")
        if len(ab) > 700:
            warnings.append(f"{eid}: abilities block very long ({len(ab)} chars)")
        for w in e.get("weapons", []):
            if not DMG_TOKEN_RE.match(w.get("dmg", "")):
                warnings.append(f"{eid}: bad weapon dmg {w!r}")
    return warnings


def parse_bestiary() -> list[dict]:
    by_file: dict[str, str] = {}
    entries: list[dict] = []
    for cfg in BESTIARY_ENTRIES:
        path = SECTIONS / cfg["file"]
        if cfg["file"] not in by_file:
            by_file[cfg["file"]] = clean_section_text(path.read_text(encoding="utf-8"))
        row = _parse_bestiary_entry(by_file[cfg["file"]], cfg)
        if row and row.get("attributes"):
            entries.append(row)
    warnings = _validate_bestiary(entries)
    for w in warnings:
        print(f"  bestiary warning: {w}")
    return entries


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    weapons = parse_weapons()
    armor = parse_armor()
    magic = parse_magic()
    monsters = parse_bestiary()

    for name, data in [
        ("weapons.json", weapons),
        ("armor.json", armor),
        ("magic.json", magic),
        ("monsters.json", monsters),
    ]:
        path = OUT / name
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Wrote {len(data)} entries → {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
