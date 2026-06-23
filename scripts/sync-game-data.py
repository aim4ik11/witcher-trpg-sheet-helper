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


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    weapons = parse_weapons()
    armor = parse_armor()
    magic = parse_magic()

    for name, data in [("weapons.json", weapons), ("armor.json", armor), ("magic.json", magic)]:
        path = OUT / name
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Wrote {len(data)} entries → {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
