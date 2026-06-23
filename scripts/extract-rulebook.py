#!/usr/bin/env python3
"""Extract Witcher TRPG PDF into chunked markdown for AI/reference use."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "data" / "pdfcoffee.com_the-witcher-pen-amp-paper-rpg-pdf-free.pdf"
OUT = ROOT / "data" / "rulebook"
CHUNK_SIZE = 20
TOC_PAGES = (2, 3)  # 0-based: PDF pages 3–4


def clean_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # De-hyphenate line breaks from PDF column layout.
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    # Collapse excessive blank lines.
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def parse_toc(reader: PdfReader) -> list[dict[str, int | str]]:
    raw = "\n".join(
        clean_text(reader.pages[i].extract_text() or "") for i in TOC_PAGES if i < len(reader.pages)
    )
    entries: list[dict[str, int | str]] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.lower().startswith("table of contents"):
            continue
        m = re.match(r"^(.+?)\.{2,}\s*(\d+)\s*$", line)
        if not m:
            m = re.match(r"^•\s*(.+?)\.{2,}\s*(\d+)\s*$", line)
        if m:
            title = re.sub(r"\s+", " ", m.group(1).strip("•\t "))
            page = int(m.group(2))
            entries.append({"title": title, "page": page})
    entries.sort(key=lambda e: int(e["page"]))
    return entries


def slugify(title: str) -> str:
    s = title.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s, flags=re.UNICODE)
    s = re.sub(r"[\s_]+", "-", s).strip("-")
    return s[:80] or "section"


def write_chunks(reader: PdfReader) -> list[dict[str, int | str]]:
    chunks_dir = OUT / "chunks"
    chunks_dir.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, int | str]] = []
    total = len(reader.pages)

    for start in range(0, total, CHUNK_SIZE):
        end = min(start + CHUNK_SIZE, total) - 1
        name = f"pages-{start + 1:03d}-{end + 1:03d}.md"
        parts = [
            f"# Witcher TRPG Rulebook — Pages {start + 1}–{end + 1}",
            "",
            f"> Source PDF: `{PDF.relative_to(ROOT)}`",
            f"> Chunk: pages {start + 1}–{end + 1} of {total}",
            "",
        ]
        for i in range(start, end + 1):
            text = clean_text(reader.pages[i].extract_text() or "")
            parts.append(f"## Page {i + 1}")
            parts.append("")
            parts.append(text if text else "_(no extractable text)_")
            parts.append("")
        (chunks_dir / name).write_text("\n".join(parts), encoding="utf-8")
        manifest.append({"file": f"chunks/{name}", "start": start + 1, "end": end + 1})

    return manifest


def write_sections(reader: PdfReader, toc: list[dict[str, int | str]]) -> list[dict[str, str | int]]:
    sections_dir = OUT / "sections"
    sections_dir.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, str | int]] = []
    total = len(reader.pages)

    for idx, entry in enumerate(toc):
        start = int(entry["page"]) - 1
        end = (int(toc[idx + 1]["page"]) - 2) if idx + 1 < len(toc) else total - 1
        if start < 0 or start >= total:
            continue
        end = max(start, min(end, total - 1))

        title = str(entry["title"])
        fname = f"{int(entry['page']):03d}-{slugify(title)}.md"
        parts = [
            f"# {title}",
            "",
            f"> Rulebook pages {start + 1}–{end + 1} (PDF page ref: {entry['page']})",
            f"> Source PDF: `{PDF.relative_to(ROOT)}`",
            "",
        ]
        for i in range(start, end + 1):
            text = clean_text(reader.pages[i].extract_text() or "")
            parts.append(f"## Page {i + 1}")
            parts.append("")
            parts.append(text if text else "_(no extractable text)_")
            parts.append("")

        (sections_dir / fname).write_text("\n".join(parts), encoding="utf-8")
        manifest.append({
            "file": f"sections/{fname}",
            "title": title,
            "start": start + 1,
            "end": end + 1,
        })

    return manifest


def main() -> int:
    if not PDF.exists():
        print(f"PDF not found: {PDF}", file=sys.stderr)
        return 1

    OUT.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(str(PDF))
    total = len(reader.pages)

    toc = parse_toc(reader)
    chunk_manifest = write_chunks(reader)
    section_manifest = write_sections(reader, toc)

    toc_md = ["# Table of Contents", "", f"Total pages: {total}", ""]
    for e in toc:
        toc_md.append(f"- **{e['title']}** — p.{e['page']}")
    (OUT / "toc.md").write_text("\n".join(toc_md) + "\n", encoding="utf-8")

    readme = f"""# Witcher TRPG Rulebook (extracted text)

Machine-readable extract of the official *Witcher Pen & Paper RPG* core rulebook PDF.
Use this as the **source of truth** when updating `@wilmak/game-data` catalogs, skills, professions, and mechanics.

## Source

- PDF: `{PDF.relative_to(ROOT)}`
- Pages: {total}
- Extracted with: `scripts/extract-rulebook.py`

## Layout

| Path | Purpose |
|------|---------|
| `toc.md` | Full table of contents with page numbers |
| `chunks/` | Fixed {CHUNK_SIZE}-page slices (`pages-001-020.md`, …) — good for broad search |
| `sections/` | One file per TOC entry — good for topic-focused work |
| `manifest.json` | Machine index of chunks and sections |

## Re-extract

```bash
python3 -m venv /tmp/pdf-venv && /tmp/pdf-venv/bin/pip install pypdf -q
/tmp/pdf-venv/bin/python3 scripts/extract-rulebook.py
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
"""
    (OUT / "README.md").write_text(readme, encoding="utf-8")

    manifest = {
        "source": str(PDF.relative_to(ROOT)),
        "pages": total,
        "chunkSize": CHUNK_SIZE,
        "tocEntries": len(toc),
        "chunks": chunk_manifest,
        "sections": section_manifest,
    }
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(f"Extracted {total} pages → {OUT}")
    print(f"  TOC entries: {len(toc)}")
    print(f"  Chunks: {len(chunk_manifest)}")
    print(f"  Sections: {len(section_manifest)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
