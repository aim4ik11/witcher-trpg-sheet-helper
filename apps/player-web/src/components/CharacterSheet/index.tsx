import { useState, useMemo } from "react";
import type { Character } from "@wilmak/shared";
import {
  ATTRIBUTES,
  ATTRIBUTE_SKILLS,
  ARMOR_LABELS,
  calcVitalMaxes,
  calcDerivedStats,
  skillBase,
  isSpellcastingOccupation,
  getMagicSections,
  spellsForCategory,
  raceLabel,
  occupationLabel,
} from "@wilmak/game-data";
import "./CharacterSheet.css";

function VitalCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="vital-card">
      <div className="vital-card-label">{label}</div>
      {children}
    </div>
  );
}

interface Props {
  character: Character;
  isDM: boolean;
  onBack: () => void;
  backLabel: string;
}

const BASE_TABS = ["Stats", "Combat", "Inventory"];

export default function CharacterSheet({ character, onBack, backLabel }: Props) {
  const [tab, setTab] = useState("Stats");

  const { hpStaMax, resolveMax } = calcVitalMaxes(character);
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

  const metaParts = [
    character.race ? raceLabel(character.race) : "",
    occupation ? occupationLabel(occupation) : "",
  ].filter(Boolean);

  return (
    <div className="sheet sheet-readonly">
      <header className="sheet-header">
        <button type="button" className="back-btn" onClick={onBack}>
          {backLabel}
        </button>
      </header>

      <div className="sheet-hero">
        <h1 className="sheet-name-display">{character.name}</h1>
        {metaParts.length > 0 && (
          <div className="sheet-meta-display">{metaParts.join(" · ")}</div>
        )}
      </div>

      <p className="readonly-banner">View only — your DM updates this sheet.</p>

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
          <>
            <section className="vitals-panel">
              <div className="section-label">Vitals</div>
              <div className="vitals-grid">
                <VitalCard label="HP">
                  <span className="counter-readonly">
                    {character.vitals.hp.current}{" "}
                    <span className="max">/ {hpStaMax}</span>
                  </span>
                </VitalCard>
                <VitalCard label="STA">
                  <span className="counter-readonly">
                    {character.vitals.sta.current}{" "}
                    <span className="max">/ {hpStaMax}</span>
                  </span>
                </VitalCard>
                <VitalCard label="Resolve">
                  <span className="counter-readonly">
                    {character.vitals.resolve.current}{" "}
                    <span className="max">/ {resolveMax}</span>
                  </span>
                </VitalCard>
                <VitalCard label="Wound">
                  <div className="vital-card-value">
                    {character.vitals.woundThreshold}
                  </div>
                </VitalCard>
              </div>
            </section>

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
                      <span className="readonly-value attr-value-input">
                        {character.attributes[key] ?? 0}
                      </span>
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
                            <span className="skill-lvl"> · {level}</span>
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
              <div className="section-label">Movement & recovery</div>
              <div className="derived-grid">
                {[
                  ["Run", derived.run],
                  ["Leap", derived.leap],
                  ["Stun", derived.stun],
                  ["Rec", derived.rec],
                ].map(([l, v]) => (
                  <label key={l as string}>
                    {l as string} <span className="readonly-value">{v as number}</span>
                  </label>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === "Combat" && (
          <>
            <section className="panel">
              <div className="panel-title">Weapons</div>
              {(character.weapons ?? []).length === 0 ? (
                <p className="readonly-empty">None</p>
              ) : (
                <div className="dynamic-table-wrap">
                  <table className="dynamic-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>WA</th>
                        <th>DMG</th>
                        <th>Rel</th>
                        <th>Hand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(character.weapons ?? []).map((w) => (
                        <tr key={w.id ?? w.name}>
                          <td>{w.name}</td>
                          <td>{w.type}</td>
                          <td>{w.wa}</td>
                          <td>{w.dmg}</td>
                          <td>{w.rel}</td>
                          <td>{w.hand}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <section className="panel bonus-melee">
              <div className="panel-title">Bonus melee</div>
              <div className="derived-grid">
                <label>
                  Punch{" "}
                  <span className="readonly-value">
                    {character.bonusMelee?.punch || "—"}
                  </span>
                </label>
                <label>
                  Kick{" "}
                  <span className="readonly-value">
                    {character.bonusMelee?.kick || "—"}
                  </span>
                </label>
              </div>
            </section>
            <section className="panel">
              <div className="panel-title">Armor</div>
              <div className="dynamic-table-wrap">
                <table className="dynamic-table">
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
                    {(character.armor ?? []).map((piece) => (
                      <tr key={piece.slot}>
                        <td>{ARMOR_LABELS[piece.slot] ?? piece.slot}</td>
                        <td>{piece.name || "—"}</td>
                        <td>{piece.sp}</td>
                        <td>{piece.damage}</td>
                        <td>{piece.effects || "—"}</td>
                        <td>{piece.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {character.armorNotes && (
                <p className="readonly-notes">{character.armorNotes}</p>
              )}
            </section>
          </>
        )}

        {tab === "Inventory" && (
          <section className="panel">
            <div className="panel-title">Consumables</div>
            {(character.consumables ?? []).length === 0 ? (
              <p className="readonly-empty">None</p>
            ) : (
              <div className="dynamic-table-wrap">
                <table className="dynamic-table">
                  <thead>
                    <tr>
                      <th>Qty</th>
                      <th>Name</th>
                      <th>Effect</th>
                      <th>Wt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(character.consumables ?? []).map((c) => (
                      <tr key={c.id ?? c.name}>
                        <td>{c.qty}</td>
                        <td>{c.name}</td>
                        <td>{c.effect}</td>
                        <td>{c.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === "Magic" &&
          showMagic &&
          magicSections.map((section) => {
            const rows = spellsForCategory(character.spells, section.key);
            return (
              <section key={section.key} className="panel magic-section">
                <div className="panel-title">{section.label}</div>
                {rows.length === 0 ? (
                  <p className="readonly-empty">None</p>
                ) : (
                  <div className="dynamic-table-wrap">
                    <table className="dynamic-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>STA</th>
                          <th>Defense</th>
                          <th>Range</th>
                          <th>Duration</th>
                          <th>Effect</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((s) => (
                          <tr key={s.id ?? s.name}>
                            <td>{s.name}</td>
                            <td>{s.staCost}</td>
                            <td>{s.defense ?? "—"}</td>
                            <td>{s.range}</td>
                            <td>{s.duration}</td>
                            <td>{s.effect}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}

        {tab === "Other" && (
          <>
            <section className="panel">
              <div className="panel-title">Profession abilities</div>
              {(character.professionAbilities ?? []).length === 0 ? (
                <p className="readonly-empty">None</p>
              ) : (
                <div className="dynamic-table-wrap">
                  <table className="dynamic-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Stat</th>
                        <th>Lvl</th>
                        <th>Base</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(character.professionAbilities ?? []).map((a) => (
                        <tr key={a.id ?? a.name}>
                          <td>{a.name}</td>
                          <td>{a.stat}</td>
                          <td>{a.level}</td>
                          <td>{a.base}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <section className="panel">
              <div className="panel-title">Wounds</div>
              {(character.wounds ?? []).length === 0 ? (
                <p className="readonly-empty">None</p>
              ) : (
                <div className="dynamic-table-wrap">
                  <table className="dynamic-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>S/T</th>
                        <th>Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(character.wounds ?? []).map((w) => (
                        <tr key={w.id ?? w.description}>
                          <td>{w.description}</td>
                          <td>{w.severity}</td>
                          <td>{w.days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <section className="panel">
              <div className="panel-title">Status effects</div>
              {(character.statusEffects ?? []).length === 0 ? (
                <p className="readonly-empty">None</p>
              ) : (
                <ul>
                  {(character.statusEffects ?? []).map((e) => (
                    <li key={e.id ?? e.description}>{e.description}</li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
