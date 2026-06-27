import { useState, useEffect, useMemo } from "react";
import type { Character, Weapon, ArmorPiece, Spell } from "@wilmak/shared";
import {
  ATTRIBUTE_SKILLS,
  ARMOR_LABELS,
  calcVitalMaxes,
  calcDerivedStats,
  skillBase,
  normalizeCharacter,
  restCharacterVitals,
} from "@wilmak/game-data";
import {
  isSpellcastingOccupation,
  getMagicSections,
  spellsForCategory,
} from "@wilmak/game-data";
import {
  WEAPONS_CATALOG,
  catalogToWeapon,
  catalogToArmorPiece,
  catalogToSpell,
  getArmorForSlot,
  getMagicForCategory,
} from "@wilmak/game-data";
import CatalogPickerModal from "../CatalogPickerModal";
import PlayerProgressionPanel from "../PlayerProgressionPanel";
import "../Stepper/Stepper.css";
import "./CharacterSheet.css";
import "../CatalogPickerModal/CatalogPickerModal.css";
import "../RaceOccupationSelect/RaceOccupationSelect.css";
import CharacterInfoBar from "./CharacterInfoBar";
import StatsTab from "./StatsTab";
import CombatTab from "./CombatTab";
import InventoryTab from "./InventoryTab";
import MagicTab from "./MagicTab";
import OtherTab from "./OtherTab";
import EnemyStatblock from "./EnemyStatblock";

const BASE_TABS = ["Stats", "Combat", "Inventory"];

function trainedSkills(character: Character) {
  const rows: {
    attrKey: string;
    skillKey: string;
    label: string;
    level: number;
    base: number;
  }[] = [];
  for (const [attrKey, skills] of Object.entries(ATTRIBUTE_SKILLS)) {
    for (const skill of skills) {
      const level = character.skills[attrKey]?.[skill.key]?.level ?? 0;
      if (level > 0) {
        rows.push({
          attrKey,
          skillKey: skill.key,
          label: skill.label,
          level,
          base: skillBase(character, attrKey, skill.key),
        });
      }
    }
  }
  return rows;
}

interface PickerState {
  kind: "weapon" | "armor" | "magic";
  slotIndex?: number;
  slot?: string;
  category?: string;
  label?: string;
}

interface Props {
  character: Character;
  onChange?: (c: Character) => void;
  isDM: boolean;
  onBack: () => void;
  backLabel: string;
  onSkillCheck?: (params: {
    attrKey: string;
    skillKey: string;
    skillLabel: string;
  }) => void;
  onMagicCast?: (params: { spell: Spell }) => void;
}

export default function CharacterSheet({
  character,
  onChange,
  isDM,
  onBack,
  backLabel,
  onSkillCheck,
  onMagicCast,
}: Props) {
  const [tab, setTab] = useState("Stats");
  const [picker, setPicker] = useState<PickerState | null>(null);
  const readOnly = !isDM;
  const profile = character.monsterProfile;
  const isBestiary = !!character.bestiaryId;
  const isMonster = character.enemyKind === "monster";
  const isEnemyStatblock = character.type === "enemy" && !!profile;
  const isNpcStatblock = isEnemyStatblock && character.enemyKind === "npc";
  const isPlayerSheet = character.type === "player" && !isEnemyStatblock;
  const statsLocked = isPlayerSheet && character.creation?.complete === true;
  const playerCanSpend = !isDM && statsLocked && !!onChange;
  const skillCheckable = isDM && !!onSkillCheck;
  const skillRows = useMemo(() => trainedSkills(character), [character]);

  const { hpStaMax } = calcVitalMaxes(character);
  const derivedLocked = !isBestiary;
  const derived = useMemo(() => {
    if (isBestiary) {
      return {
        run: character.movement?.run ?? 0,
        leap: character.movement?.leap ?? 0,
        stun: character.recovery?.stun ?? 0,
        rec: character.recovery?.rec ?? 0,
        luckMax: character.luck?.max ?? character.attributes?.luck ?? 0,
        punch: character.bonusMelee?.punch ?? "—",
        kick: character.bonusMelee?.kick ?? "—",
      };
    }
    return calcDerivedStats(character);
  }, [character, isBestiary]);
  const hpMax = isBestiary ? character.vitals.hp.max : hpStaMax;
  const staMax = isBestiary ? character.vitals.sta.max : hpStaMax;
  const occupation = character.occupation || "";
  const showMagic = isSpellcastingOccupation(occupation);
  const magicCastable = isDM && !!onMagicCast && showMagic;
  const magicSections = useMemo(() => getMagicSections(occupation), [occupation]);

  const tabs = useMemo(() => {
    const list = [...BASE_TABS];
    if (showMagic) list.push("Magic");
    list.push("Other");
    return list;
  }, [showMagic]);

  useEffect(() => {
    if (tab === "Magic" && !showMagic) setTab("Stats");
  }, [tab, showMagic]);

  function update(patch: Partial<Character>) {
    if (readOnly || !onChange) return;
    onChange(normalizeCharacter({ ...character, ...patch }));
  }

  function updateNested(path: string[], value: unknown) {
    if (readOnly || !onChange) return;
    const next = structuredClone(character) as unknown as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: any = next;
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
    obj[path[path.length - 1]] = value;
    onChange(normalizeCharacter(next as unknown as Character));
  }

  const atFullHealth =
    character.vitals.hp.current >= hpMax && character.vitals.sta.current >= staMax;

  function handleRest() {
    if (readOnly || !onChange) return;
    onChange(restCharacterVitals(character));
  }

  function updateSpellsForCategory(category: string, categoryRows: Spell[]) {
    const others = (character.spells ?? []).filter(
      (s) => (s.category || "spell") !== category,
    );
    const normalized = categoryRows.map((row) => ({
      ...row,
      id: row.id ?? crypto.randomUUID(),
      category,
    }));
    update({ spells: [...others, ...normalized] });
  }

  return (
    <div className="sheet">
      <header className="page-topbar">
        <div className="page-topbar__inner">
          <button type="button" className="back-btn" onClick={onBack}>
            {backLabel}
          </button>
          <span className="sheet-topbar-name">{character.name}</span>
          {!readOnly && <span className="sheet-save-hint">Saved automatically</span>}
        </div>
      </header>

      <div className="sheet-page-body">
        {readOnly && !isEnemyStatblock && !playerCanSpend && (
          <p className="readonly-banner">View only — your DM updates this sheet.</p>
        )}
        {playerCanSpend && (
          <p className="readonly-banner spend-banner">
            Spend your I.P. and training points below — changes save automatically.
          </p>
        )}

        {playerCanSpend && (
          <PlayerProgressionPanel
            character={character}
            onApply={(c) => onChange!(c)}
          />
        )}

        {!isEnemyStatblock && (
          <CharacterInfoBar
            character={character}
            isDM={isDM}
            hpMax={hpMax}
            staMax={staMax}
            derived={derived}
            atFullHealth={atFullHealth}
            onRest={handleRest}
            updateNested={updateNested}
            update={update}
            isPlayerSheet={isPlayerSheet}
            isMonster={isMonster}
            isEnemyStatblock={isEnemyStatblock}
          />
        )}

        {!isEnemyStatblock && (
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
        )}

      <div className="sheet-body">
        {isEnemyStatblock ? (
          <EnemyStatblock
            character={character}
            update={update}
            updateNested={updateNested}
            readOnly={readOnly}
            isDM={isDM}
            onChange={onChange}
            atFullHealth={atFullHealth}
            onRest={handleRest}
            hpMax={hpMax}
            staMax={staMax}
            derived={derived}
            isMonster={isMonster}
            isNpcStatblock={isNpcStatblock}
            skillRows={skillRows}
            skillCheckable={skillCheckable}
            onSkillCheck={onSkillCheck}
            setPicker={setPicker}
          />
        ) : null}
        {!isEnemyStatblock && (
          <>
            {tab === "Stats" && (
              <StatsTab
                character={character}
                update={update}
                updateNested={updateNested}
                readOnly={readOnly}
                isDM={isDM}
                playerCanSpend={playerCanSpend}
                skillCheckable={skillCheckable}
                derived={derived}
                isBestiary={isBestiary}
                derivedLocked={derivedLocked}
                onChange={onChange}
                onSkillCheck={onSkillCheck}
              />
            )}

            {tab === "Combat" && (
              <CombatTab
                character={character}
                update={update}
                updateNested={updateNested}
                readOnly={readOnly}
                setPicker={setPicker}
              />
            )}

            {tab === "Inventory" && (
              <InventoryTab
                character={character}
                update={update}
                readOnly={readOnly}
              />
            )}

            {tab === "Magic" && showMagic && (
              <MagicTab
                character={character}
                updateSpellsForCategory={updateSpellsForCategory}
                readOnly={readOnly}
                magicSections={magicSections}
                magicCastable={magicCastable}
                setPicker={setPicker}
                onMagicCast={onMagicCast}
              />
            )}

            {tab === "Other" && (
              <OtherTab
                character={character}
                update={update}
                readOnly={readOnly}
              />
            )}
          </>
        )}
      </div>

      {picker?.kind === "weapon" && (
        <CatalogPickerModal
          title="Add Weapon"
          items={WEAPONS_CATALOG}
          onSelect={(item) => {
            update({
              weapons: [
                ...(character.weapons ?? []),
                catalogToWeapon(item as Parameters<typeof catalogToWeapon>[0]),
              ],
            });
            setPicker(null);
          }}
          onCustom={() => {
            update({
              weapons: [
                ...(character.weapons ?? []),
                {
                  name: "",
                  type: "",
                  wa: 0,
                  dmg: "",
                  rel: "",
                  hand: "",
                  rng: "",
                  effect: "",
                  conc: "",
                  enhancements: "",
                  weight: 0,
                  id: crypto.randomUUID(),
                } as Weapon,
              ],
            });
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}

      {picker?.kind === "magic" && (
        <CatalogPickerModal
          title={`Add ${picker.label}`}
          items={getMagicForCategory(picker.category!)}
          onSelect={(item) => {
            updateSpellsForCategory(picker.category!, [
              ...spellsForCategory(character.spells, picker.category!),
              catalogToSpell(
                item as Parameters<typeof catalogToSpell>[0],
                picker.category!,
              ),
            ]);
            setPicker(null);
          }}
          onCustom={() => {
            updateSpellsForCategory(picker.category!, [
              ...spellsForCategory(character.spells, picker.category!),
              {
                name: "",
                staCostText: "",
                defense: "",
                range: "",
                duration: "",
                effect: "",
                id: crypto.randomUUID(),
                category: picker.category!,
              } as Spell,
            ]);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}

      {picker?.kind === "armor" && (
        <CatalogPickerModal
          title={`Armor — ${ARMOR_LABELS[picker.slot!] ?? picker.slot}`}
          items={getArmorForSlot(picker.slot!)}
          onSelect={(item) => {
            const armor = [...(character.armor ?? [])] as ArmorPiece[];
            armor[picker.slotIndex!] = {
              ...armor[picker.slotIndex!],
              ...catalogToArmorPiece(
                item as Parameters<typeof catalogToArmorPiece>[0],
                picker.slot,
              ),
            };
            update({ armor });
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      </div>
    </div>
  );
}
