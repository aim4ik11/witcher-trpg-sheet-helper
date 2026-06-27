import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Character } from "@wilmak/shared";
import {
  ATTRIBUTES,
  ATTRIBUTE_SKILLS,
  calcVitalMaxes,
  calcDerivedStats,
  isSpellcastingOccupation,
  getMagicSections,
} from "@wilmak/game-data";
import PlayerProgressionPanel from "../PlayerProgressionPanel";
import CharacterInfoBar from "./CharacterInfoBar";
import StatsTab from "./StatsTab";
import CombatTab from "./CombatTab";
import InventoryTab from "./InventoryTab";
import MagicTab from "./MagicTab";
import OtherTab from "./OtherTab";
import "../DmSessionControls/DmSessionControls.css";
import "./CharacterSheet.css";

const BASE_TABS = ["Stats", "Combat", "Inventory"];
const SEARCH_SKIP_KEYS = ["luck"];

interface Props {
  character: Character;
  isDM: boolean;
  onChange?: (c: Character) => void;
  onBack: () => void;
  backLabel: string;
}

export default function CharacterSheet({ character, onChange, onBack, backLabel }: Props) {
  const [tab, setTab] = useState("Stats");
  const statsLocked = character.creation?.complete === true;
  const playerCanSpend = statsLocked && !!onChange;

  const { hpStaMax } = calcVitalMaxes(character);
  const derived = useMemo(() => calcDerivedStats(character), [character]);
  const occupation = character.occupation || "";
  const showMagic = isSpellcastingOccupation(occupation);
  const magicSections = useMemo(() => getMagicSections(occupation), [occupation]);

  const tabs = useMemo(() => {
    const list = [...BASE_TABS];
    if (showMagic) list.push("Magic");
    list.push("Other");
    return list;
  }, [showMagic]);

  // ── Search ────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [navKey, setNavKey] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
    else setSearchQuery("");
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSearch();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [searchOpen]);

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
  }

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    const results: Array<{ key: string; label: string }> = [];
    for (const [key, attr] of Object.entries(ATTRIBUTES)) {
      if (SEARCH_SKIP_KEYS.includes(key) || seen.has(key)) continue;
      const attrHit =
        key.startsWith(q) ||
        attr.short.toLowerCase().startsWith(q) ||
        attr.label.toLowerCase().includes(q);
      if (attrHit) {
        seen.add(key);
        results.push({ key, label: `${attr.short} · ${attr.label}` });
        continue;
      }
      for (const skill of ATTRIBUTE_SKILLS[key] ?? []) {
        if (skill.label.toLowerCase().includes(q) || skill.key.includes(q)) {
          seen.add(key);
          results.push({ key, label: `${attr.short} › ${skill.label}` });
          break;
        }
      }
    }
    return results.slice(0, 6);
  }, [searchQuery]);

  function handleSearchSelect(key: string) {
    setTab("Stats");
    setNavKey(key);
    closeSearch();
  }

  const onNavConsumed = useCallback(() => setNavKey(null), []);
  // ─────────────────────────────────────────────────────────

  return (
    <div className="sheet sheet-readonly">
      <header className="sheet-header">
        <button type="button" className="back-btn" onClick={onBack}>
          {backLabel}
        </button>

        {searchOpen ? (
          <div className="header-search-wrap">
            <input
              ref={searchInputRef}
              type="search"
              className="header-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stats & skills…"
            />
            <button
              type="button"
              className="header-search-close"
              onClick={closeSearch}
              aria-label="Close search"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="header-search-btn"
            onClick={() => setSearchOpen(true)}
            aria-label="Search stats and skills"
          >
            ⌕
          </button>
        )}

        {searchOpen && searchQuery.trim() && (
          <div className="header-search-dropdown" role="listbox">
            {searchResults.length > 0 ? (
              searchResults.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  role="option"
                  className="header-search-result"
                  onClick={() => handleSearchSelect(r.key)}
                >
                  {r.label}
                </button>
              ))
            ) : (
              <p className="header-search-empty">No results</p>
            )}
          </div>
        )}
      </header>

      <div className="sheet-page-body">
        <h1 className="sheet-name-display">{character.name}</h1>

        <CharacterInfoBar
          character={character}
          hpMax={hpStaMax}
          staMax={hpStaMax}
          playerCanSpend={playerCanSpend}
        />

        <p className="readonly-banner">
          {playerCanSpend
            ? "Spend your I.P. and training points below — changes save automatically."
            : "View only — your DM updates this sheet."}
        </p>

        {playerCanSpend && onChange && (
          <PlayerProgressionPanel character={character} onApply={onChange} />
        )}

        <div className="sheet-tabs-wrap">
          <div className="tab-bar">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="sheet-body">
          {tab === "Stats" && (
            <StatsTab
              character={character}
              derived={derived}
              playerCanSpend={playerCanSpend}
              onChange={onChange}
              navKey={navKey}
              onNavConsumed={onNavConsumed}
            />
          )}
          {tab === "Combat" && <CombatTab character={character} />}
          {tab === "Inventory" && <InventoryTab character={character} />}
          {tab === "Magic" && showMagic && (
            <MagicTab character={character} magicSections={magicSections} />
          )}
          {tab === "Other" && <OtherTab character={character} />}
        </div>
      </div>
    </div>
  );
}
