import { useState, useEffect, useMemo } from "react";
import type { Character, Weapon, ArmorPiece, Spell } from "@wilmak/shared";
import {
  ATTRIBUTES,
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
  MAGIC_ROW_EMPTY,
} from "@wilmak/game-data";
import {
  WEAPONS_CATALOG,
  catalogToWeapon,
  catalogToArmorPiece,
  catalogToSpell,
  getArmorForSlot,
  getMagicForCategory,
} from "@wilmak/game-data";
import type { CatalogItem } from "@wilmak/game-data";
import {
  RaceSelect,
  OccupationSelect,
  RaceOccupationDisplay,
  occupationAfterRaceChange,
} from "../RaceOccupationSelect";
import CatalogPickerModal from "../CatalogPickerModal";
import ProfessionSkillTree from "../ProfessionSkillTree";
import DmSessionControls from "../DmSessionControls";
import PlayerProgressionPanel, {
  SkillSpendButton,
  StatSpendButton,
} from "../PlayerProgressionPanel";
import Stepper from "../Stepper";
import "../DmSessionControls/DmSessionControls.css";
import "../Stepper/Stepper.css";
import "./CharacterSheet.css";
import "../CatalogPickerModal/CatalogPickerModal.css";
import "../RaceOccupationSelect/RaceOccupationSelect.css";

const BASE_TABS = ["Stats", "Combat", "Inventory"];

const WEAPON_EMPTY: Partial<Weapon> = {
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
};

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

interface CounterProps {
  current: number;
  max: number;
  label: string;
  readOnly?: boolean;
  onChange: (v: number) => void;
  layout?: "row" | "card";
}
function Counter({
  current,
  max,
  label,
  readOnly,
  onChange,
  layout = "row",
}: CounterProps) {
  const body = readOnly ? (
    <span className="counter-readonly">
      {current} <span className="max">/ {max}</span>
    </span>
  ) : (
    <div className="counter">
      <button type="button" onClick={() => onChange(Math.max(0, current - 1))}>
        −
      </button>
      <span className="value">{current}</span>
      <span className="max">/ {max}</span>
      <button type="button" onClick={() => onChange(Math.min(max, current + 1))}>
        +
      </button>
    </div>
  );

  if (layout === "card") {
    return (
      <div className="vital-card">
        <div className="vital-card-label">{label}</div>
        {body}
      </div>
    );
  }

  return (
    <div className="vital-row">
      <span className="vital-label">{label}</span>
      {body}
    </div>
  );
}

interface NumInputProps {
  value?: number;
  onChange: (v: number) => void;
  className?: string;
  readOnly?: boolean;
}
function NumInput({ value, onChange, className = "", readOnly }: NumInputProps) {
  if (readOnly)
    return <span className={`readonly-value ${className}`}>{value ?? 0}</span>;
  return (
    <input
      type="number"
      className={className}
      value={value ?? 0}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
    />
  );
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  readOnly?: boolean;
}
function TextInput({ value, onChange, readOnly, ...props }: TextInputProps) {
  if (readOnly) return <span className="readonly-value">{value || "—"}</span>;
  return <input value={value ?? ""} onChange={onChange} {...props} />;
}

interface ColDef {
  key: string;
  label: string;
  type?: string;
}
interface DynRow {
  id?: string;
  [key: string]: unknown;
}

interface DynamicTableProps {
  columns: ColDef[];
  rows: DynRow[];
  onChange: (rows: DynRow[]) => void;
  onAdd: (empty: DynRow) => void;
  onRemove: (i: number) => void;
  emptyRow: DynRow;
  readOnly?: boolean;
  renderAddActions?: () => React.ReactNode;
}
function DynamicTable({
  columns,
  rows,
  onChange,
  onAdd,
  onRemove,
  emptyRow,
  readOnly,
  renderAddActions,
}: DynamicTableProps) {
  if (readOnly && rows.length === 0) return <p className="readonly-empty">None</p>;
  return (
    <div className="dynamic-table-wrap">
      <table className="dynamic-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {!readOnly && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={(row.id as string) ?? i}>
              {columns.map((col) => (
                <td key={col.key}>
                  {readOnly ? (
                    <span>
                      {(row[col.key] as string | number) ??
                        (col.type === "number" ? 0 : "—")}
                    </span>
                  ) : (
                    <input
                      type={col.type === "number" ? "number" : "text"}
                      value={
                        (row[col.key] as string | number) ??
                        (col.type === "number" ? 0 : "")
                      }
                      onChange={(e) => {
                        const val =
                          col.type === "number"
                            ? parseInt(e.target.value, 10) || 0
                            : e.target.value;
                        const updated = [...rows];
                        updated[i] = { ...updated[i], [col.key]: val };
                        onChange(updated);
                      }}
                    />
                  )}
                </td>
              ))}
              {!readOnly && (
                <td>
                  <button type="button" className="danger" onClick={() => onRemove(i)}>
                    ×
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly &&
        (renderAddActions ? (
          <div className="add-actions">{renderAddActions()}</div>
        ) : (
          <button type="button" className="add-row-btn" onClick={() => onAdd(emptyRow)}>
            + Add row
          </button>
        ))}
    </div>
  );
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
}

export default function CharacterSheet({
  character,
  onChange,
  isDM,
  onBack,
  backLabel,
}: Props) {
  const [tab, setTab] = useState("Stats");
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [manualEdit, setManualEdit] = useState(false);
  const readOnly = !isDM;
  const profile = character.monsterProfile;
  const isBestiary = !!character.bestiaryId;
  const isMonster = character.enemyKind === "monster";
  const isEnemyStatblock = character.type === "enemy" && !!profile;
  const isNpcStatblock = isEnemyStatblock && character.enemyKind === "npc";
  const isPlayerSheet = character.type === "player" && !isEnemyStatblock;
  const statsLocked = isPlayerSheet && character.creation?.complete === true;
  const statsEditable = isDM && (!statsLocked || manualEdit);
  const playerCanSpend = !isDM && statsLocked && !!onChange;
  const attrReadOnly = !statsEditable;
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
    <div
      className={`sheet${readOnly ? " sheet-readonly" : ""}${isEnemyStatblock ? " sheet--enemy-statblock" : ""}`}
    >
      <header className="sheet-header">
        <button type="button" className="back-btn" onClick={onBack}>
          {backLabel}
        </button>
        {!readOnly && <span className="sheet-save-hint">Saved automatically</span>}
      </header>

      <div className="sheet-hero">
        {readOnly ? (
          <>
            <h1 className="sheet-name-display">{character.name}</h1>
            <div className="sheet-meta-display">
              {isMonster && profile?.monsterType ? (
                <span className="sheet-monster-type">{profile.monsterType}</span>
              ) : (
                <RaceOccupationDisplay race={character.race} occupation={occupation} />
              )}
              {profile?.threat && (
                <span className="sheet-threat">{profile.threat}</span>
              )}
            </div>
          </>
        ) : (
          <>
            <input
              className="sheet-name"
              value={character.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            <div className="sheet-meta">
              {isMonster ? (
                profile?.monsterType && (
                  <span className="sheet-monster-type">{profile.monsterType}</span>
                )
              ) : isEnemyStatblock ? (
                <RaceOccupationDisplay race={character.race} occupation={occupation} />
              ) : (
                <>
                  <div className="sheet-meta-chip">
                    <span className="chip-label">Race</span>
                    <RaceSelect
                      value={character.race ?? ""}
                      onChange={(v) => {
                        const occ = occupationAfterRaceChange(
                          v,
                          character.occupation ?? "",
                        );
                        update({ race: v, occupation: occ });
                      }}
                    />
                  </div>
                  <div className="sheet-meta-chip">
                    <span className="chip-label">Occupation</span>
                    <OccupationSelect
                      race={character.race ?? ""}
                      value={occupation}
                      onChange={(v) => update({ occupation: v })}
                    />
                  </div>
                </>
              )}
              {character.type === "player" && (
                <div className="sheet-meta-chip">
                  <span className="chip-label">Nickname</span>
                  <input
                    value={character.nickname ?? ""}
                    onChange={(e) =>
                      update({
                        nickname: e.target.value.toLowerCase().replace(/\s/g, ""),
                      })
                    }
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {readOnly && !isEnemyStatblock && !playerCanSpend && (
        <p className="readonly-banner">View only — your DM updates this sheet.</p>
      )}
      {playerCanSpend && (
        <p className="readonly-banner spend-banner">
          Spend your I.P. and training points below — changes save automatically.
        </p>
      )}

      {isDM && isPlayerSheet && statsLocked && onChange && (
        <DmSessionControls
          character={character}
          manualEdit={manualEdit}
          onManualEditChange={setManualEdit}
          onChange={(patch) => update(patch)}
        />
      )}

      {playerCanSpend && (
        <PlayerProgressionPanel
          character={character}
          onApply={(c) => onChange!(c)}
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

      <div
        className={`sheet-body${isEnemyStatblock ? " sheet-body--enemy-statblock" : ""}`}
      >
        {isEnemyStatblock ? (
          <div className="enemy-statblock-grid">
            <section className="panel enemy-combat-panel">
              <div className="panel-title-row">
                <div className="panel-title">Combat</div>
                {isDM && onChange && (
                  <button
                    type="button"
                    className="btn-sm sheet-rest-btn"
                    onClick={handleRest}
                    disabled={atFullHealth}
                    title="Restore HP and STA to max"
                  >
                    Rest
                  </button>
                )}
              </div>
              <Counter
                readOnly={readOnly}
                label="HP"
                current={character.vitals.hp.current}
                max={hpMax}
                onChange={(v) => updateNested(["vitals", "hp", "current"], v)}
              />
              <Counter
                readOnly={readOnly}
                label="STA"
                current={character.vitals.sta.current}
                max={staMax}
                onChange={(v) => updateNested(["vitals", "sta", "current"], v)}
              />
              <div className="enemy-derived-grid">
                <label>
                  RUN{" "}
                  <NumInput
                    readOnly={readOnly}
                    value={derived.run}
                    onChange={(v) => updateNested(["movement", "run"], v)}
                  />
                </label>
                <label>
                  LEAP{" "}
                  <NumInput
                    readOnly={readOnly}
                    value={derived.leap}
                    onChange={(v) => updateNested(["movement", "leap"], v)}
                  />
                </label>
                <label>
                  STUN{" "}
                  <NumInput
                    readOnly={readOnly}
                    value={derived.stun}
                    onChange={(v) => updateNested(["recovery", "stun"], v)}
                  />
                </label>
                <label>
                  REC{" "}
                  <NumInput
                    readOnly={readOnly}
                    value={derived.rec}
                    onChange={(v) => updateNested(["recovery", "rec"], v)}
                  />
                </label>
                {profile?.vigor != null && profile.vigor > 0 && (
                  <label>
                    VIGOR <span className="readonly-value">{profile.vigor}</span>
                  </label>
                )}
              </div>
            </section>

            <section className="panel enemy-info-panel">
              <div className="panel-title">{isMonster ? "Monster" : "NPC"}</div>
              <dl className="monster-profile-grid">
                {profile?.threat && (
                  <>
                    <dt>Threat</dt>
                    <dd>{profile.threat}</dd>
                  </>
                )}
                {profile?.bounty != null && profile.bounty > 0 && (
                  <>
                    <dt>Bounty</dt>
                    <dd>{profile.bounty}</dd>
                  </>
                )}
                {profile?.naturalArmor != null && (
                  <>
                    <dt>Armor</dt>
                    <dd>{profile.naturalArmor} SP</dd>
                  </>
                )}
                {profile?.height && (
                  <>
                    <dt>Height</dt>
                    <dd>{profile.height}</dd>
                  </>
                )}
                {profile?.weight && (
                  <>
                    <dt>Weight</dt>
                    <dd>{profile.weight}</dd>
                  </>
                )}
                {profile?.environment && (
                  <>
                    <dt>Environment</dt>
                    <dd>{profile.environment}</dd>
                  </>
                )}
                {profile?.intelligence && (
                  <>
                    <dt>Intelligence</dt>
                    <dd>{profile.intelligence}</dd>
                  </>
                )}
                {profile?.organization && (
                  <>
                    <dt>Organization</dt>
                    <dd>{profile.organization}</dd>
                  </>
                )}
                {profile?.encumbrance != null && (
                  <>
                    <dt>ENC</dt>
                    <dd>{profile.encumbrance}</dd>
                  </>
                )}
              </dl>
            </section>

            <section className="panel enemy-attrs-panel enemy-statblock-span-2">
              <div className="panel-title">Attributes</div>
              <div className="enemy-attr-grid">
                {Object.entries(ATTRIBUTES).map(([key, attr]) => (
                  <label
                    key={key}
                    className={`enemy-attr-pill enemy-attr-pill--${key}`}
                  >
                    <span className="enemy-attr-short">{attr.short}</span>
                    <NumInput
                      readOnly={readOnly}
                      className="enemy-attr-value"
                      value={character.attributes[key]}
                      onChange={(v) => updateNested(["attributes", key], v)}
                    />
                  </label>
                ))}
              </div>
            </section>

            {skillRows.length > 0 && (
              <section className="panel enemy-skills-panel enemy-statblock-span-2">
                <div className="panel-title">Skills</div>
                <table className="enemy-skills-table">
                  <thead>
                    <tr>
                      <th>Skill</th>
                      <th>Lvl</th>
                      <th>Base</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skillRows.map((row) => (
                      <tr key={`${row.attrKey}-${row.skillKey}`}>
                        <td>{row.label}</td>
                        <td>
                          <NumInput
                            readOnly={readOnly}
                            value={row.level}
                            onChange={(v) =>
                              updateNested(
                                ["skills", row.attrKey, row.skillKey, "level"],
                                v,
                              )
                            }
                          />
                        </td>
                        <td className="skill-base">{row.base}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {(character.weapons ?? []).length > 0 && (
              <section className="panel enemy-weapons-panel enemy-statblock-span-2">
                <div className="panel-title">Attacks</div>
                <table className="enemy-weapons-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>DMG</th>
                      <th>Effect</th>
                      <th>RNG</th>
                      <th>ROF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(character.weapons ?? []).map((w, i) => (
                      <tr key={w.id ?? i}>
                        <td>
                          {readOnly ? (
                            w.name
                          ) : (
                            <input
                              value={w.name}
                              onChange={(e) => {
                                const weapons = [...(character.weapons ?? [])];
                                weapons[i] = {
                                  ...weapons[i],
                                  name: e.target.value,
                                };
                                update({ weapons });
                              }}
                            />
                          )}
                        </td>
                        <td>
                          {readOnly ? (
                            w.dmg
                          ) : (
                            <input
                              value={w.dmg}
                              onChange={(e) => {
                                const weapons = [...(character.weapons ?? [])];
                                weapons[i] = {
                                  ...weapons[i],
                                  dmg: e.target.value,
                                };
                                update({ weapons });
                              }}
                            />
                          )}
                        </td>
                        <td>
                          {readOnly ? (
                            w.effect || "—"
                          ) : (
                            <input
                              value={w.effect}
                              onChange={(e) => {
                                const weapons = [...(character.weapons ?? [])];
                                weapons[i] = {
                                  ...weapons[i],
                                  effect: e.target.value,
                                };
                                update({ weapons });
                              }}
                            />
                          )}
                        </td>
                        <td>
                          {readOnly ? (
                            w.rng || "—"
                          ) : (
                            <input
                              value={w.rng}
                              onChange={(e) => {
                                const weapons = [...(character.weapons ?? [])];
                                weapons[i] = {
                                  ...weapons[i],
                                  rng: e.target.value,
                                };
                                update({ weapons });
                              }}
                            />
                          )}
                        </td>
                        <td>
                          {readOnly ? (
                            w.rel || "—"
                          ) : (
                            <input
                              value={w.rel}
                              onChange={(e) => {
                                const weapons = [...(character.weapons ?? [])];
                                weapons[i] = {
                                  ...weapons[i],
                                  rel: e.target.value,
                                };
                                update({ weapons });
                              }}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {profile?.vulnerabilities && (
              <section className="panel enemy-vuln-panel">
                <div className="panel-title">Vulnerabilities</div>
                <p className="monster-profile-text">{profile.vulnerabilities}</p>
              </section>
            )}

            {profile?.abilities && (
              <section className="panel enemy-abilities-panel">
                <div className="panel-title">Abilities</div>
                <p className="monster-profile-text">{profile.abilities}</p>
              </section>
            )}

            {profile?.loot && (
              <section className="panel enemy-loot-panel enemy-statblock-span-2">
                <div className="panel-title">Loot</div>
                <p className="monster-profile-text">{profile.loot}</p>
              </section>
            )}

            {isNpcStatblock && (
              <section className="panel enemy-armor-panel enemy-statblock-span-2">
                <div className="panel-title">Worn armor</div>
                <table className="enemy-armor-table">
                  <thead>
                    <tr>
                      <th>Slot</th>
                      <th>Piece</th>
                      <th>SP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(character.armor ?? []).map((piece) => {
                      const slotIndex = (character.armor ?? []).findIndex(
                        (a) => a.slot === piece.slot,
                      );
                      return (
                        <tr key={piece.slot}>
                          <td>{ARMOR_LABELS[piece.slot] ?? piece.slot}</td>
                          <td>
                            <div className="armor-name-cell">
                              {piece.name ? (
                                <span>{piece.name}</span>
                              ) : (
                                <span className="readonly-value">—</span>
                              )}
                              {!readOnly && (
                                <button
                                  type="button"
                                  className="armor-pick-btn"
                                  onClick={() =>
                                    setPicker({
                                      kind: "armor",
                                      slotIndex,
                                      slot: piece.slot,
                                    })
                                  }
                                >
                                  {piece.name ? "Change" : "Pick"}
                                </button>
                              )}
                            </div>
                          </td>
                          <td>
                            <NumInput
                              readOnly={readOnly}
                              value={piece.sp}
                              onChange={(v) => {
                                const armor = [...(character.armor ?? [])];
                                if (slotIndex >= 0) {
                                  armor[slotIndex] = {
                                    ...armor[slotIndex],
                                    sp: v,
                                  };
                                  update({ armor });
                                }
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )}

            <section className="panel enemy-notes-panel enemy-statblock-span-2">
              <div className="panel-title">Combat notes</div>
              <div className="enemy-notes-grid">
                <div>
                  <div className="monster-profile-label">Wounds</div>
                  <DynamicTable
                    readOnly={readOnly}
                    columns={[
                      { key: "description", label: "Wound" },
                      { key: "severity", label: "S/T" },
                      { key: "days", label: "Days", type: "number" },
                    ]}
                    rows={(character.wounds ?? []) as unknown as DynRow[]}
                    onChange={(rows) =>
                      update({ wounds: rows as unknown as Character["wounds"] })
                    }
                    onAdd={(empty) =>
                      update({
                        wounds: [
                          ...(character.wounds ?? []),
                          { ...empty, id: crypto.randomUUID() } as NonNullable<
                            Character["wounds"]
                          >[number],
                        ],
                      })
                    }
                    onRemove={(i) =>
                      update({
                        wounds: character.wounds!.filter((_, idx) => idx !== i),
                      })
                    }
                    emptyRow={{ description: "", severity: "", days: 0 }}
                  />
                </div>
                <div>
                  <div className="monster-profile-label">Status effects</div>
                  <DynamicTable
                    readOnly={readOnly}
                    columns={[{ key: "description", label: "Effect" }]}
                    rows={(character.statusEffects ?? []) as unknown as DynRow[]}
                    onChange={(rows) =>
                      update({
                        statusEffects: rows as unknown as Character["statusEffects"],
                      })
                    }
                    onAdd={(empty) =>
                      update({
                        statusEffects: [
                          ...(character.statusEffects ?? []),
                          { ...empty, id: crypto.randomUUID() } as NonNullable<
                            Character["statusEffects"]
                          >[number],
                        ],
                      })
                    }
                    onRemove={(i) =>
                      update({
                        statusEffects: character.statusEffects!.filter(
                          (_, idx) => idx !== i,
                        ),
                      })
                    }
                    emptyRow={{ description: "" }}
                  />
                </div>
              </div>
            </section>
          </div>
        ) : (
          <>
            {tab === "Stats" && (
              <>
                {profile && !isEnemyStatblock && (
                  <section className="panel monster-profile-panel">
                    <div className="panel-title">
                      {isMonster ? "Monster" : "NPC"} — {profile.monsterType}
                    </div>
                    <dl className="monster-profile-grid">
                      {profile.threat && (
                        <>
                          <dt>Threat</dt>
                          <dd>{profile.threat}</dd>
                        </>
                      )}
                      {profile.bounty != null && profile.bounty > 0 && (
                        <>
                          <dt>Bounty</dt>
                          <dd>{profile.bounty}</dd>
                        </>
                      )}
                      {profile.naturalArmor != null && (
                        <>
                          <dt>Natural armor</dt>
                          <dd>{profile.naturalArmor} SP</dd>
                        </>
                      )}
                      {profile.height && (
                        <>
                          <dt>Height</dt>
                          <dd>{profile.height}</dd>
                        </>
                      )}
                      {profile.weight && (
                        <>
                          <dt>Weight</dt>
                          <dd>{profile.weight}</dd>
                        </>
                      )}
                      {profile.environment && (
                        <>
                          <dt>Environment</dt>
                          <dd>{profile.environment}</dd>
                        </>
                      )}
                      {profile.intelligence && (
                        <>
                          <dt>Intelligence</dt>
                          <dd>{profile.intelligence}</dd>
                        </>
                      )}
                      {profile.organization && (
                        <>
                          <dt>Organization</dt>
                          <dd>{profile.organization}</dd>
                        </>
                      )}
                      {profile.vigor != null && (
                        <>
                          <dt>Vigor</dt>
                          <dd>{profile.vigor}</dd>
                        </>
                      )}
                      {profile.encumbrance != null && (
                        <>
                          <dt>Encumbrance</dt>
                          <dd>{profile.encumbrance}</dd>
                        </>
                      )}
                    </dl>
                    {profile.vulnerabilities && (
                      <div className="monster-profile-block">
                        <div className="monster-profile-label">Vulnerabilities</div>
                        <p className="monster-profile-text">
                          {profile.vulnerabilities}
                        </p>
                      </div>
                    )}
                    {profile.abilities && (
                      <div className="monster-profile-block">
                        <div className="monster-profile-label">Abilities</div>
                        <p className="monster-profile-text">{profile.abilities}</p>
                      </div>
                    )}
                    {profile.loot && (
                      <div className="monster-profile-block">
                        <div className="monster-profile-label">Loot</div>
                        <p className="monster-profile-text">{profile.loot}</p>
                      </div>
                    )}
                  </section>
                )}

                <section className="vitals-panel">
                  <div className="section-label-row">
                    <div className="section-label">Vitals</div>
                    {isDM && onChange && (
                      <button
                        type="button"
                        className="btn-sm sheet-rest-btn"
                        onClick={handleRest}
                        disabled={atFullHealth}
                        title="Restore HP and STA to max"
                      >
                        Rest
                      </button>
                    )}
                  </div>
                  <div className="vitals-grid">
                    <Counter
                      layout="card"
                      readOnly={readOnly}
                      label="HP"
                      current={character.vitals.hp.current}
                      max={hpMax}
                      onChange={(v) => updateNested(["vitals", "hp", "current"], v)}
                    />
                    <Counter
                      layout="card"
                      readOnly={readOnly}
                      label="STA"
                      current={character.vitals.sta.current}
                      max={staMax}
                      onChange={(v) => updateNested(["vitals", "sta", "current"], v)}
                    />
                    <div className="vital-card">
                      <div className="vital-card-label">Wound threshold</div>
                      <div className="vital-card-value">
                        {character.vitals.woundThreshold}
                      </div>
                    </div>
                  </div>
                  <p className="formula-hint">
                    {isBestiary
                      ? "Stats from rulebook bestiary — HP/STA/RUN/LEAP/STUN/REC as printed."
                      : "HP & STA from Physical Table (BODY + WILL) ÷ 2; wound threshold = max HP ÷ 5."}
                  </p>
                </section>

                <ProfessionSkillTree
                  character={character}
                  readOnly={attrReadOnly}
                  spendMode={playerCanSpend}
                  onTreeChange={(professionTree, definingSkillLevel) =>
                    update({
                      professionTree,
                      ...(definingSkillLevel != null
                        ? { definingSkillLevel }
                        : {}),
                    })
                  }
                  onApply={(c) => onChange?.(c)}
                />

                <section>
                  <div className="section-label">Attributes & skills</div>
                  <div className="attr-grid">
                    {Object.entries(ATTRIBUTES).map(([key, attr]) => (
                      <div key={key} className="attr-block">
                        <div className={`attr-header attr-header--${key}`}>
                          <div className="attr-header-text">
                            <span className="attr-short">{attr.short}</span>
                            <span className="attr-full">{attr.label}</span>
                          </div>
                          {statsEditable ? (
                            <Stepper
                              className="attr-stepper"
                              value={character.attributes[key] ?? 1}
                              min={1}
                              max={10}
                              onChange={(v) => updateNested(["attributes", key], v)}
                            />
                          ) : (
                            <span className="readonly-value attr-value-input">
                              {character.attributes[key] ?? 0}
                            </span>
                          )}
                          {!statsEditable && playerCanSpend && onChange && (
                            <StatSpendButton
                              character={character}
                              attrKey={key}
                              onApply={onChange}
                            />
                          )}
                        </div>
                        {(ATTRIBUTE_SKILLS[key] ?? []).map((skill) => {
                          const level = character.skills[key]?.[skill.key]?.level ?? 0;
                          return (
                            <div
                              key={skill.key}
                              className={`skill-row${skill.special ? " special" : ""}`}
                            >
                              <span className="name">
                                {skill.label}
                                {statsEditable ? (
                                  <>
                                    {" · "}
                                    <Stepper
                                      className="skill-stepper"
                                      value={level}
                                      min={0}
                                      max={10}
                                      onChange={(v) =>
                                        updateNested(
                                          ["skills", key, skill.key, "level"],
                                          v,
                                        )
                                      }
                                    />
                                  </>
                                ) : (
                                  <span className="skill-lvl"> · {level}</span>
                                )}
                                {!statsEditable && playerCanSpend && onChange && (
                                  <SkillSpendButton
                                    character={character}
                                    attrKey={key}
                                    skillKey={skill.key}
                                    label={skill.label}
                                    special={skill.special}
                                    onApply={onChange}
                                  />
                                )}
                              </span>
                              <span className="base">
                                {skillBase(character, key, skill.key)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="misc-stats">
                  <div className="section-label">Movement, recovery & progression</div>
                  <div className="attr-block luck-block">
                    <div className="attr-header attr-header--luck">
                      <div className="attr-header-text">
                        <span className="attr-short">LUCK</span>
                        <span className="attr-full">Luck</span>
                      </div>
                      <span className="readonly-value attr-value-input">
                        {character.attributes.luck ?? 0}
                      </span>
                    </div>
                    <div className="luck-row">
                      <span className="luck-spent-label">spent</span>
                      <div className="luck-bar">
                        {Array.from({
                          length: derived.luckMax || character.luck?.max || 0,
                        }).map((_, i) =>
                          readOnly ? (
                            <span
                              key={i}
                              className={`luck-pip luck-pip-static${i < (character.luck?.used ?? 0) ? " used" : ""}`}
                            />
                          ) : (
                            <button
                              key={i}
                              type="button"
                              className={`luck-pip${i < (character.luck?.used ?? 0) ? " used" : ""}`}
                              onClick={() => {
                                const used =
                                  i < (character.luck?.used ?? 0) ? i : i + 1;
                                updateNested(["luck", "used"], used);
                              }}
                            />
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="derived-grid">
                    <label>
                      RUN{" "}
                      <NumInput
                        readOnly={readOnly || derivedLocked}
                        value={derived.run}
                        onChange={(v) => updateNested(["movement", "run"], v)}
                      />
                    </label>
                    <label>
                      LEAP{" "}
                      <NumInput
                        readOnly={readOnly || derivedLocked}
                        value={derived.leap}
                        onChange={(v) => updateNested(["movement", "leap"], v)}
                      />
                    </label>
                    <label>
                      STUN{" "}
                      <NumInput
                        readOnly={readOnly || derivedLocked}
                        value={derived.stun}
                        onChange={(v) => updateNested(["recovery", "stun"], v)}
                      />
                    </label>
                    <label>
                      REC{" "}
                      <NumInput
                        readOnly={readOnly || derivedLocked}
                        value={derived.rec}
                        onChange={(v) => updateNested(["recovery", "rec"], v)}
                      />
                    </label>
                    <label>
                      I.P.{" "}
                      <NumInput
                        readOnly={attrReadOnly}
                        value={character.improvementPoints?.ip}
                        onChange={(v) => updateNested(["improvementPoints", "ip"], v)}
                      />
                    </label>
                    <label>
                      Training I.P.{" "}
                      <NumInput
                        readOnly={attrReadOnly}
                        value={character.improvementPoints?.trainingIp}
                        onChange={(v) =>
                          updateNested(["improvementPoints", "trainingIp"], v)
                        }
                      />
                    </label>
                    <label>
                      Punch <span className="readonly-value">{derived.punch}</span>
                    </label>
                    <label>
                      Kick <span className="readonly-value">{derived.kick}</span>
                    </label>
                  </div>
                </section>
              </>
            )}

            {tab === "Combat" && (
              <>
                <section className="panel">
                  <div className="panel-title">Weapons</div>
                  <DynamicTable
                    readOnly={readOnly}
                    columns={[
                      { key: "name", label: "Name" },
                      { key: "type", label: "T" },
                      { key: "wa", label: "WA", type: "number" },
                      { key: "dmg", label: "DMG" },
                      { key: "rel", label: "Rel" },
                      { key: "hand", label: "Hand" },
                      { key: "rng", label: "RNG" },
                      { key: "effect", label: "Effect" },
                      { key: "conc", label: "Conc." },
                      { key: "enhancements", label: "EN" },
                      { key: "weight", label: "Wt", type: "number" },
                    ]}
                    rows={(character.weapons ?? []) as unknown as DynRow[]}
                    onChange={(rows) =>
                      update({ weapons: rows as unknown as Weapon[] })
                    }
                    onAdd={() => {}}
                    onRemove={(i) =>
                      update({
                        weapons: character.weapons!.filter((_, idx) => idx !== i),
                      })
                    }
                    emptyRow={WEAPON_EMPTY as DynRow}
                    renderAddActions={() => (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => setPicker({ kind: "weapon" })}
                      >
                        + Add from catalog
                      </button>
                    )}
                  />
                </section>

                <section className="panel bonus-melee">
                  <div className="panel-title">Bonus Melee</div>
                  <div className="stat-grid">
                    <label>
                      Punch{" "}
                      <TextInput
                        readOnly={readOnly}
                        value={character.bonusMelee?.punch ?? ""}
                        onChange={(e) =>
                          updateNested(["bonusMelee", "punch"], e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Kick{" "}
                      <TextInput
                        readOnly={readOnly}
                        value={character.bonusMelee?.kick ?? ""}
                        onChange={(e) =>
                          updateNested(["bonusMelee", "kick"], e.target.value)
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-title">Armor</div>
                  <table>
                    <thead>
                      <tr>
                        <th>Location</th>
                        <th>Piece</th>
                        <th>SP</th>
                        <th>Dam</th>
                        <th>Effects</th>
                        <th>Wt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(character.armor ?? []).map((piece, i) => (
                        <tr key={piece.slot}>
                          <td>{ARMOR_LABELS[piece.slot] ?? piece.slot}</td>
                          <td>
                            <div className="armor-name-cell">
                              {piece.name && (
                                <span className="armor-piece-name">{piece.name}</span>
                              )}
                              {!readOnly && (
                                <button
                                  type="button"
                                  className="armor-pick-btn"
                                  onClick={() =>
                                    setPicker({
                                      kind: "armor",
                                      slotIndex: i,
                                      slot: piece.slot,
                                    })
                                  }
                                >
                                  {piece.name ? "Change" : "Pick armor"}
                                </button>
                              )}
                              {readOnly && !piece.name && (
                                <span className="readonly-value">—</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <NumInput
                              readOnly={readOnly}
                              value={piece.sp}
                              onChange={(v) => {
                                const a = [...character.armor!];
                                a[i] = { ...a[i], sp: v };
                                update({ armor: a });
                              }}
                            />
                          </td>
                          <td>
                            <NumInput
                              readOnly={readOnly}
                              value={piece.damage}
                              onChange={(v) => {
                                const a = [...character.armor!];
                                a[i] = { ...a[i], damage: v };
                                update({ armor: a });
                              }}
                            />
                          </td>
                          <td>
                            <TextInput
                              readOnly={readOnly}
                              value={piece.effects ?? ""}
                              onChange={(e) => {
                                const a = [...character.armor!];
                                a[i] = { ...a[i], effects: e.target.value };
                                update({ armor: a });
                              }}
                            />
                          </td>
                          <td>
                            <NumInput
                              readOnly={readOnly}
                              value={piece.weight}
                              onChange={(v) => {
                                const a = [...character.armor!];
                                a[i] = { ...a[i], weight: v };
                                update({ armor: a });
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {readOnly ? (
                    character.armorNotes ? (
                      <p className="readonly-notes">{character.armorNotes}</p>
                    ) : null
                  ) : (
                    <textarea
                      className="armor-notes"
                      placeholder="Armor notes..."
                      value={character.armorNotes ?? ""}
                      onChange={(e) => update({ armorNotes: e.target.value })}
                      rows={2}
                    />
                  )}
                </section>
              </>
            )}

            {tab === "Inventory" && (
              <section className="panel">
                <div className="panel-title">Ammo, Bombs, Potions, Traps</div>
                <DynamicTable
                  readOnly={readOnly}
                  columns={[
                    { key: "qty", label: "#", type: "number" },
                    { key: "name", label: "Name" },
                    { key: "effect", label: "Effect" },
                    { key: "weight", label: "Wt", type: "number" },
                  ]}
                  rows={(character.consumables ?? []) as unknown as DynRow[]}
                  onChange={(rows) =>
                    update({
                      consumables: rows as unknown as Character["consumables"],
                    })
                  }
                  onAdd={(empty) =>
                    update({
                      consumables: [
                        ...(character.consumables ?? []),
                        { ...empty, id: crypto.randomUUID() } as NonNullable<
                          Character["consumables"]
                        >[number],
                      ],
                    })
                  }
                  onRemove={(i) =>
                    update({
                      consumables: character.consumables!.filter((_, idx) => idx !== i),
                    })
                  }
                  emptyRow={{ qty: 0, name: "", effect: "", weight: 0 }}
                />
              </section>
            )}

            {tab === "Magic" && showMagic && (
              <>
                {magicSections.map((section) => (
                  <section key={section.key} className="panel magic-section">
                    <div className="panel-title">{section.label}</div>
                    <DynamicTable
                      readOnly={readOnly}
                      columns={[
                        { key: "name", label: "Name" },
                        { key: "staCostText", label: "STA" },
                        { key: "defense", label: "Defense" },
                        { key: "range", label: "Range" },
                        { key: "duration", label: "Duration" },
                        { key: "effect", label: "Effect" },
                      ]}
                      rows={
                        spellsForCategory(
                          character.spells,
                          section.key,
                        ) as unknown as DynRow[]
                      }
                      onChange={(rows) =>
                        updateSpellsForCategory(section.key, rows as unknown as Spell[])
                      }
                      onAdd={() => {}}
                      onRemove={(i) => {
                        const rows = spellsForCategory(character.spells, section.key);
                        updateSpellsForCategory(
                          section.key,
                          rows.filter((_, idx) => idx !== i),
                        );
                      }}
                      emptyRow={{ ...MAGIC_ROW_EMPTY }}
                      renderAddActions={() => (
                        <button
                          type="button"
                          className="primary"
                          onClick={() =>
                            setPicker({
                              kind: "magic",
                              category: section.key,
                              label: section.label,
                            })
                          }
                        >
                          + Add from catalog
                        </button>
                      )}
                    />
                  </section>
                ))}
              </>
            )}

            {tab === "Other" && (
              <>
                <section className="panel">
                  <div className="panel-title">Wounds</div>
                  <DynamicTable
                    readOnly={readOnly}
                    columns={[
                      { key: "description", label: "Wound" },
                      { key: "severity", label: "S/T" },
                      { key: "days", label: "Days", type: "number" },
                    ]}
                    rows={(character.wounds ?? []) as unknown as DynRow[]}
                    onChange={(rows) =>
                      update({ wounds: rows as unknown as Character["wounds"] })
                    }
                    onAdd={(empty) =>
                      update({
                        wounds: [
                          ...(character.wounds ?? []),
                          { ...empty, id: crypto.randomUUID() } as NonNullable<
                            Character["wounds"]
                          >[number],
                        ],
                      })
                    }
                    onRemove={(i) =>
                      update({
                        wounds: character.wounds!.filter((_, idx) => idx !== i),
                      })
                    }
                    emptyRow={{ description: "", severity: "", days: 0 }}
                  />
                </section>
                <section className="panel">
                  <div className="panel-title">Status Effects</div>
                  <DynamicTable
                    readOnly={readOnly}
                    columns={[{ key: "description", label: "Effect" }]}
                    rows={(character.statusEffects ?? []) as unknown as DynRow[]}
                    onChange={(rows) =>
                      update({
                        statusEffects: rows as unknown as Character["statusEffects"],
                      })
                    }
                    onAdd={(empty) =>
                      update({
                        statusEffects: [
                          ...(character.statusEffects ?? []),
                          { ...empty, id: crypto.randomUUID() } as NonNullable<
                            Character["statusEffects"]
                          >[number],
                        ],
                      })
                    }
                    onRemove={(i) =>
                      update({
                        statusEffects: character.statusEffects!.filter(
                          (_, idx) => idx !== i,
                        ),
                      })
                    }
                    emptyRow={{ description: "" }}
                  />
                </section>
              </>
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
                { ...WEAPON_EMPTY, id: crypto.randomUUID() } as Weapon,
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
                ...MAGIC_ROW_EMPTY,
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
  );
}
