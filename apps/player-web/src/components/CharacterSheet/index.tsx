import { useState, useMemo } from "react";
import type { Character } from "@wilmak/shared";
import {
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

  return (
    <div className="sheet sheet-readonly">
      <header className="sheet-header">
        <button type="button" className="back-btn" onClick={onBack}>
          {backLabel}
        </button>
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
