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
                "tags": [row["avail"].lower(), f"ae-{row['ae']}", f"ev-{row['ev']}"],
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
    homebrew_path = OUT / "homebrew-magic.json"
    homebrew: list[dict] = []
    if homebrew_path.is_file():
        homebrew = json.loads(homebrew_path.read_text(encoding="utf-8"))
    return merge_magic_entries(
        parse_signs()
        + parse_mage_spells()
        + parse_invocations()
        + parse_rituals()
        + parse_hexes()
        + homebrew
    )


def item_entry(
    name: str,
    category: str,
    *,
    source: str,
    weight: float = 0.0,
    cost: int = 0,
    effect: str = "",
    rarity: str = "",
    avail: str = "",
    quantity: str = "",
    forage_dc: str = "",
    tags: list[str] | None = None,
    **extra: str | int | float,
) -> dict:
    tag_list = [category, source, *(tags or [])]
    if rarity:
        tag_list.append(rarity.lower())
    if avail:
        tag_list.append(avail.lower())
    entry: dict = {
        "id": f"{slug_id(category)}-{slug_id(name)}",
        "name": clean_field(name),
        "category": category,
        "source": source,
        "weight": weight,
        "cost": cost,
        "effect": clean_field(effect),
        "tags": [t for t in tag_list if t],
    }
    if rarity:
        entry["rarity"] = rarity
    if avail:
        entry["avail"] = avail
    if quantity:
        entry["quantity"] = clean_field(quantity)
    if forage_dc:
        entry["forageDc"] = clean_field(forage_dc)
    entry.update({k: clean_field(v) if isinstance(v, str) else v for k, v in extra.items() if v != ""})
    return entry


def parse_float_token(token: str) -> float:
    if token.upper() == "N/A":
        return 0.0
    try:
        return float(token)
    except ValueError:
        return 0.0


def table_text(path: Path) -> str:
    return clean_section_text(path.read_text(encoding="utf-8"))


def parse_weight_cost_rows(text: str, category: str, source: str) -> list[dict]:
    items: list[dict] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or line.startswith(">"):
            continue
        if line.lower() in {"name weight cost", "name cost", "quality cost"}:
            continue
        m = re.match(r"^(.+?)\s+([\d.]+)\s+(\d+)$", line)
        if m:
            name, weight, cost = m.groups()
            items.append(
                item_entry(name, category, source=source, weight=parse_float_token(weight), cost=int(cost))
            )
            continue
        service = re.match(r"^(.+?)\s+(\d+)$", line)
        if service:
            name, cost = service.groups()
            if len(name) > 3 and not name.startswith("## Page"):
                items.append(item_entry(name, category, source=source, cost=int(cost)))
    return items


def parse_general_gear() -> list[dict]:
    text = table_text(SECTIONS / "093-general-gear.md")
    page = text.split("## Page 94", 1)[0]
    items: list[dict] = []
    ranges = [
        ("lodging", "Quality Cost", "Lodging"),
        ("general-gear", "Name Weight Cost", "Name Weight Cost"),
        ("containers", "Name Weight Cost", "Name Weight Cost"),
        ("food-drink", "Name Weight Cost", "Name Weight Cost"),
        ("clothing", "Name Weight Cost", "Name Cost"),
        ("services", "Name Cost", "## Page"),
    ]
    start = 0
    for idx, (category, marker, end_marker) in enumerate(ranges):
        at = page.find(marker, start)
        if at < 0:
            continue
        block_start = at + len(marker)
        if idx + 1 < len(ranges):
            next_marker = ranges[idx + 1][1]
            block_end = page.find(next_marker, block_start)
        else:
            block_end = page.find(end_marker, block_start)
        if block_end < 0:
            block_end = len(page)
        items.extend(parse_weight_cost_rows(page[block_start:block_end], category, "general-gear"))
        start = block_end
    return items


def parse_alchemical_items() -> list[dict]:
    text = table_text(SECTIONS / "087-alchemical-items.md")
    body = text.split("## Page 89", 1)[0]
    rows: list[dict] = []
    current: dict[str, str] | None = None
    effect_lines: list[str] = []
    in_table = False
    for raw in body.splitlines():
        line = raw.strip()
        if line == "Name Avail. Effect Weight Cost":
            in_table = True
            continue
        if not in_table or not line or line.startswith("## Page") or line.isdigit():
            continue
        done = re.match(r"^([\d.]+)\s+(\d+)$", line)
        if done and current:
            rows.append(
                item_entry(
                    current["name"],
                    "alchemical-item",
                    source="alchemical-items",
                    avail=current["avail"],
                    effect=" ".join(effect_lines),
                    weight=parse_float_token(done.group(1)),
                    cost=int(done.group(2)),
                    tags=["consumable"],
                )
            )
            current = None
            effect_lines = []
            continue
        start = re.match(r"^([A-Z][A-Za-z0-9’' -]+?)\s+([ECPR])(?:\s+(.+))?$", line)
        if start and not current:
            current = {"name": start.group(1), "avail": start.group(2)}
            if start.group(3):
                effect_lines.append(start.group(3))
            continue
        if current:
            effect_lines.append(line)
    return rows


def parse_armor_enhancements() -> list[dict]:
    text = table_text(SECTIONS / "090-armor-enhancements.md")
    items: list[dict] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or line.startswith(">") or line.startswith("Name "):
            continue
        m = re.match(r"^(.+?)\s+(.+?)\s+([ECPR])\s+([\d.]+)\s+(\d+)$", line)
        if not m:
            continue
        name, effect, avail, weight, cost = m.groups()
        if "Armor  Enhancements" in name:
            continue
        items.append(
            item_entry(
                name,
                "armor-enhancement",
                source="armor-enhancements",
                avail=avail,
                effect=effect,
                weight=parse_float_token(weight),
                cost=int(cost),
            )
        )
    return items


def parse_transportation() -> list[dict]:
    text = table_text(SECTIONS / "091-transportation.md")
    items: list[dict] = []
    mount_block = text.split("Mounts & Vehicles", 1)[0]
    current: dict[str, str] | None = None
    effect_lines: list[str] = []
    for raw in mount_block.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or line.startswith(">") or line.startswith("Name "):
            continue
        done = re.match(r"^(.+?)\s+([ECPR])\s+(.+?)\s+([\d.]+)\s+(\d+)$", line)
        if done:
            name, avail, effect, weight, cost = done.groups()
            items.append(
                item_entry(
                    name,
                    "mount-gear",
                    source="transportation",
                    avail=avail,
                    effect=effect,
                    weight=parse_float_token(weight),
                    cost=int(cost),
                )
            )
            current = None
            effect_lines = []
            continue
        start = re.match(r"^(.+?)\s+([ECPR])(?:\s+(.+))?$", line)
        if start:
            current = {"name": start.group(1), "avail": start.group(2)}
            effect_lines = [start.group(3) or ""]
            continue
        finish = re.match(r"^([\d.]+)\s+(\d+)$", line)
        if finish and current:
            items.append(
                item_entry(
                    current["name"],
                    "mount-gear",
                    source="transportation",
                    avail=current["avail"],
                    effect=" ".join(effect_lines),
                    weight=parse_float_token(finish.group(1)),
                    cost=int(finish.group(2)),
                )
            )
            current = None
            effect_lines = []
            continue
        if current:
            effect_lines.append(line)

    vehicle = re.search(r"Name Athletics Control\s+Mod\s+Speed Health Weight Cost(.+)$", text, re.DOTALL)
    if vehicle:
        for raw in vehicle.group(1).splitlines():
            line = raw.strip()
            m = re.match(r"^(.+?)\s+(N/A|\d+)\s+([+-]\d+)\s+(.+?)\s+(\d+)\s+([\d.]+)\s+(\d+)$", line)
            if m:
                name, athletics, control, speed, health, weight, cost = m.groups()
                items.append(
                    item_entry(
                        name,
                        "mount-vehicle",
                        source="transportation",
                        weight=parse_float_token(weight),
                        cost=int(cost),
                        effect=f"Athletics {athletics}; Control {control}; Speed {speed}; Health {health}",
                    )
                )
    return items


def parse_tool_kits() -> list[dict]:
    text = table_text(SECTIONS / "092-tool-kits.md")
    block = text.split("Name Effect Conc. Weight Cost", 1)[-1]
    kit_names = [
        "Alchemy Set",
        "Amulet, Gemstone",
        "Amulet, Simple",
        "Cooking Tools",
        "Crafting Tools",
        "Disguise Kit",
        "Fine Art Tools",
        "Fishing Gear",
        "Forgery Kit",
        "Makeup Kit",
        "Merchant’s Tools",
        "Surgeon’s Kit",
        "Telecommunicator",
        "Thieves’ Tools",
        "Tinker’s Forge",
        "Writing Kit",
    ]
    rows: list[str] = []
    buf = ""
    for raw in block.splitlines():
        line = raw.strip()
        if not line or line.startswith("## Page"):
            continue
        if re.search(r"\s[TSL]\s+[\d.]+\s+\d+$", line):
            rows.append(f"{buf} {line}".strip())
            buf = ""
        else:
            buf = f"{buf} {line}".strip()
    items: list[dict] = []
    for row in rows:
        m = re.match(r"^(.+?)\s+([TSL])\s+([\d.]+)\s+(\d+)$", row)
        if m:
            body, conc, weight, cost = m.groups()
            name = next((n for n in kit_names if body.startswith(n)), "")
            if not name:
                continue
            effect = body[len(name) :].strip()
            items.append(
                item_entry(
                    name,
                    "tool-kit",
                    source="tool-kits",
                    effect=effect,
                    weight=parse_float_token(weight),
                    cost=int(cost),
                    concealment=conc,
                )
            )
    # These rows wrap awkwardly in the PDF extract and can be swallowed by the
    # preceding entry. Keep them explicit so the generated catalog stays complete.
    items = [i for i in items if i["name"] not in {"Telecommunicator", "Tinker’s Forge", "Writing Kit", "Thieves’ Tools"}]
    fixed_rows = [
        ("Telecommunicator", "Allows you to communicate with the Telecommunication ritual", "L", 4, 1000),
        ("Thieves’ Tools", "Allows you to pick locks", "T", 1, 80),
        ("Tinker’s Forge", "Allows you to forge weapons and armor anywhere", "L", 5, 111),
        ("Writing Kit", "Allows you to write letters, notes, and such", "S", 1, 25),
    ]
    for name, effect, conc, weight, cost in fixed_rows:
        items.append(
            item_entry(
                name,
                "tool-kit",
                source="tool-kits",
                effect=effect,
                weight=weight,
                cost=cost,
                concealment=conc,
            )
        )
    return items


def parse_resource_rows(text: str, category: str, source: str) -> list[dict]:
    def complete(row: str) -> bool:
        return bool(re.search(r"\s(?:N/A|[\d.]+)\s+\d+$", row))

    rows: list[str] = []
    buf = ""
    for raw in text.splitlines():
        line = raw.strip()
        if (
            not line
            or line.startswith("#")
            or line.startswith(">")
            or line.startswith("## Page")
            or line.isdigit()
            or line.startswith("Name Rarity")
            or line in {"Crafting Materials", "Hides & Animal Parts", "Alchemical Treatments", "Ingots & Minerals"}
        ):
            continue
        starts = re.match(r"^[A-Z][A-Za-z0-9’' &.-]+?\s+[ECPR]\s+", line)
        if starts and buf:
            rows.append(buf)
            buf = line
            if complete(buf):
                rows.append(buf)
                buf = ""
        else:
            if not buf and not starts:
                continue
            buf = f"{buf} {line}".strip()
            if complete(buf):
                rows.append(buf)
                buf = ""
    if buf:
        rows.append(buf)

    items: list[dict] = []
    for row in rows:
        parts = row.split()
        rarity_i = next((i for i, p in enumerate(parts) if p in {"E", "C", "P", "R"}), -1)
        if rarity_i <= 0 or len(parts) < rarity_i + 5:
            continue
        name = " ".join(parts[:rarity_i])
        rarity = parts[rarity_i]
        cost = int(parts[-1]) if re.match(r"^\d+$", parts[-1]) else 0
        weight = parse_float_token(parts[-2])
        forage = parts[-3]
        quantity = ""
        location = " ".join(parts[rarity_i + 1 : -3])
        qmatch = re.search(r"((?:N/A|Variable|\d+d\d+(?:/\d+)?)(?: Units)?)$", location)
        if qmatch:
            quantity = qmatch.group(1)
            location = location[: qmatch.start()].strip()
        items.append(
            item_entry(
                name,
                category,
                source=source,
                rarity=rarity,
                weight=weight,
                cost=cost,
                quantity=quantity,
                forage_dc=forage,
                location=location,
            )
        )
    return items


def parse_witcher_gear() -> list[dict]:
    text = table_text(SECTIONS / "246-witcher-gear.md")
    items: list[dict] = []

    potions = re.search(r"Witcher Potions\nName Effects Dura\. Tox \.(.+?)Name Type", text, re.DOTALL)
    if potions:
        for row in re.finditer(r"^([A-Z][A-Za-z’' ]+?)\s+(.+?)\s+([0-9/]+(?: Rounds| Hour| Hours)|N/A)\s+([0-9]+%|N/A)$", potions.group(1), re.MULTILINE):
            name, effect, duration, toxicity = row.groups()
            items.append(
                item_entry(
                    name,
                    "witcher-potion",
                    source="witcher-gear",
                    weight=0.5,
                    effect=effect,
                    duration=duration,
                    toxicity=toxicity,
                    tags=["consumable", "witcher"],
                )
            )

    oils = re.search(r"Name Effects\n(Beast Oil.+?)Name Effects", text, re.DOTALL)
    if oils:
        for raw in oils.group(1).splitlines():
            line = raw.strip()
            m = re.match(r"^(.+? Oil|Hanged Man’s Venom)\s+(.+)$", line)
            if m:
                items.append(
                    item_entry(
                        m.group(1),
                        "blade-oil",
                        source="witcher-gear",
                        weight=0.5,
                        effect=m.group(2),
                        duration="30 minutes",
                        tags=["consumable", "witcher"],
                    )
                )

    decoctions = re.search(r"Name Effects\n(?:Beast Oil.+?)Name Effects\n(.+?)## Page 249", text, re.DOTALL)
    if decoctions:
        for raw in decoctions.group(1).splitlines():
            line = raw.strip()
            m = re.match(r"^([A-Z][A-Za-z ]+?)\s+(.+)$", line)
            if m:
                items.append(
                    item_entry(
                        f"{m.group(1)} Decoction",
                        "witcher-decoction",
                        source="witcher-gear",
                        weight=0.5,
                        effect=m.group(2),
                        duration="30 minutes",
                        toxicity="75%",
                        tags=["consumable", "witcher"],
                    )
                )
    return items


def parse_mutagens() -> list[dict]:
    text = table_text(SECTIONS / "251-mutagens.md")
    items: list[dict] = []
    color = ""
    for raw in text.splitlines():
        line = raw.strip()
        cm = re.match(r"^(Red|Green|Blue) Mutagens$", line)
        if cm:
            color = cm.group(1).lower()
            continue
        m = re.match(r"^([A-Z][A-Za-z ]+?)\s+(.+?)\s+(\d+)\s+(.+)$", line)
        if m and color:
            source, effect, dc, mutation = m.groups()
            items.append(
                item_entry(
                    f"{source} Mutagen",
                    "mutagen",
                    source="mutagens",
                    weight=0.5,
                    effect=effect,
                    alchemyDc=int(dc),
                    minorMutation=mutation,
                    tags=[color, "witcher"],
                )
            )
    return items


def parse_runes_glyphs() -> list[dict]:
    text = table_text(SECTIONS / "256-runes-glyphs.md")
    items: list[dict] = []
    for raw in join_wrapped_lines(text):
        line = raw.strip()
        if line.startswith("Glyph of"):
            m = re.match(r"^(Glyph of [A-Za-z]+)\s+(.+)\s+([\d.]+)\s+(\d+)$", line)
            if m:
                name, effect, weight, cost = m.groups()
                items.append(
                    item_entry(name, "glyph", source="runes-glyphs", effect=effect, weight=parse_float_token(weight), cost=int(cost))
                )
        else:
            m = re.match(r"^([A-Z][a-z]+)\s+(.+)\s+([\d.]+)\s+(\d+)$", line)
            if m:
                name, effect, weight, cost = m.groups()
                if name not in {"Name", "Runes"}:
                    items.append(
                        item_entry(name, "rune", source="runes-glyphs", effect=effect, weight=parse_float_token(weight), cost=int(cost))
                    )
    return items


def parse_formulae() -> list[dict]:
    text = table_text(SECTIONS / "146-alchemical-formulae.md")
    items: list[dict] = []
    tier = ""
    for raw in text.splitlines():
        line = raw.strip()
        tm = re.match(r"^(Novice|Journeyman|Master) Formulae$", line)
        if tm:
            tier = tm.group(1).lower()
            continue
        m = re.match(r"^(.+?)\s+(\d+)\s+(.+?)\s+(\d+)$", line)
        if m and tier:
            name, dc, time, cost = m.groups()
            items.append(
                item_entry(
                    f"{name} Formula",
                    "alchemical-formula",
                    source="alchemical-formulae",
                    cost=int(cost),
                    effect=f"Craft {name}",
                    craftingDc=int(dc),
                    time=time,
                    tags=[tier],
                )
            )
    return items


def parse_crafting_diagrams() -> list[dict]:
    text = table_text(SECTIONS / "130-crafting-diagrams.md")
    rows: list[tuple[str, str]] = []
    buf = ""
    tier = ""
    for raw in text.splitlines():
        line = raw.strip()
        tm = re.match(r"^(Novice|Journeyman|Master) Diagrams$", line)
        if tm:
            tier = tm.group(1).lower()
            continue
        if (
            not line
            or line.startswith("#")
            or line.startswith(">")
            or line.startswith("## Page")
            or line.isdigit()
            or line.startswith("Name Crafting")
            or line in {"DC Time Components Investment Cost", "Ingredient Diagrams", "Weapon Diagrams"}
        ):
            continue
        if buf and re.search(r"\s+\d+\s+\d+$", buf):
            rows.append((buf, tier))
            buf = ""
        # Diagram names can be split before the Crafting DC, so continue until the row has cost fields.
        if buf or re.search(r"\s+\d{1,2}\s+", line):
            buf = f"{buf} {line}".strip()
            if re.search(r"\s+\d+\s+\d+$", buf):
                rows.append((buf, tier))
                buf = ""
        elif re.match(r"^[A-Z][A-Za-z’' ,()-]+$", line):
            buf = line
    if buf and re.search(r"\s+\d+\s+\d+$", buf):
        rows.append((buf, tier))

    items: list[dict] = []
    for row, row_tier in rows:
        m = re.match(
            r"^(.+?)\s+(\d{1,2})\s+"
            r"((?:\d+/2|\d+)\s+(?:Hour|Hours|Minutes|Rounds))\s+"
            r"(.+?)\s+(\d+)\s+(\d+)$",
            row,
        )
        if not m:
            continue
        name, dc, time, components, investment, cost = m.groups()
        if len(name) > 70 or any(skip in name for skip in ("Lotta ", "Heh,", "Crafting ")):
            continue
        items.append(
            item_entry(
                f"{name} Diagram",
                "crafting-diagram",
                source="crafting-diagrams",
                cost=int(cost),
                effect=f"Craft {name}",
                craftingDc=int(dc),
                time=time,
                components=components,
                investmentCost=int(investment),
                tags=[row_tier] if row_tier else [],
            )
        )
    return items


def parse_relic_items() -> list[dict]:
    text = table_text(SECTIONS / "257-relic-items.md")
    items: list[dict] = []
    for m in re.finditer(r"^(.+?) \(Education DC: (\d+)\)$", text, re.MULTILINE):
        name, dc = m.groups()
        items.append(
            item_entry(
                name,
                "relic-item",
                source="relic-items",
                effect=f"Education DC: {dc}",
                tags=["relic"],
            )
        )
    return items


def parse_items() -> list[dict]:
    entries = (
        parse_general_gear()
        + parse_alchemical_items()
        + parse_armor_enhancements()
        + parse_transportation()
        + parse_tool_kits()
        + parse_resource_rows(table_text(SECTIONS / "128-crafting-components.md"), "crafting-component", "crafting-components")
        + parse_resource_rows(table_text(SECTIONS / "143-alchemical-substances.md"), "alchemical-substance", "alchemical-substances")
        + parse_formulae()
        + parse_crafting_diagrams()
        + parse_witcher_gear()
        + parse_mutagens()
        + parse_runes_glyphs()
        + parse_relic_items()
    )
    by_id: dict[str, dict] = {}
    for entry in entries:
        eid = entry["id"]
        if eid in by_id:
            eid = f"{eid}-{entry['source']}"
            entry = {**entry, "id": eid}
        by_id[eid] = entry
    return sorted(by_id.values(), key=lambda x: (x["category"], x["name"]))


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


def preserve_existing_bestiary_details(entries: list[dict]) -> list[dict]:
    """Keep hand-verified tactical fields when PDF extraction misses them."""
    path = OUT / "monsters.json"
    if not path.is_file():
        return entries
    existing = {e.get("id"): e for e in json.loads(path.read_text(encoding="utf-8"))}
    preserved_fields = ("skills", "weapons", "abilities", "vulnerabilities", "loot")
    merged: list[dict] = []
    for entry in entries:
        prev = existing.get(entry.get("id"))
        if not prev:
            merged.append(entry)
            continue
        next_entry = dict(entry)
        for field in preserved_fields:
            if not next_entry.get(field) and prev.get(field):
                next_entry[field] = prev[field]
        merged.append(next_entry)
    return merged


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    weapons = parse_weapons()
    armor = parse_armor()
    magic = parse_magic()
    items = parse_items()
    monsters = preserve_existing_bestiary_details(parse_bestiary())

    for name, data in [
        ("weapons.json", weapons),
        ("armor.json", armor),
        ("magic.json", magic),
        ("items.json", items),
        ("monsters.json", monsters),
    ]:
        path = OUT / name
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Wrote {len(data)} entries → {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
