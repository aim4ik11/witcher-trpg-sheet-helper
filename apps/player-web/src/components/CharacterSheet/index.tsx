import { useState, useMemo } from 'react';
import type { Character } from '@wilmak/shared';
import {
  ATTRIBUTES, ATTRIBUTE_SKILLS, ARMOR_LABELS, calcVitalMaxes, skillBase,
  isSpellcastingOccupation, getMagicSections, spellsForCategory,
} from '@wilmak/game-data';
import { ATTRIBUTE_ICONS } from '../AttributeIcons';
import './CharacterSheet.css';

interface CounterProps { current: number; max: number; label: string; }
function Counter({ current, max, label }: CounterProps) {
  return (
    <div className="vital-row">
      <span className="vital-label">{label}</span>
      <span className="counter-readonly">{current} <span className="max">/ {max}</span></span>
    </div>
  );
}

interface Props {
  character: Character;
  isDM: boolean;
  onBack: () => void;
  backLabel: string;
}

const BASE_TABS = ['Stats', 'Combat', 'Inventory'];

export default function CharacterSheet({ character, onBack, backLabel }: Props) {
  const [tab, setTab] = useState('Stats');

  const { hpStaMax, resolveMax } = calcVitalMaxes(character);
  const occupation = character.occupation || '';
  const showMagic = isSpellcastingOccupation(occupation);
  const magicSections = useMemo(() => getMagicSections(occupation), [occupation]);

  const tabs = useMemo(() => {
    const list = [...BASE_TABS];
    if (showMagic) list.push('Magic');
    list.push('Other');
    return list;
  }, [showMagic]);

  return (
    <div className="sheet sheet-readonly">
      <header className="sheet-header">
        <button type="button" className="back-btn" onClick={onBack}>{backLabel}</button>
        <div className="sheet-identity">
          <h1 className="sheet-name-display">{character.name}</h1>
          <div className="sheet-meta-display">
            {character.race && <span>{character.race}</span>}
            {occupation && <span>{occupation}</span>}
          </div>
        </div>
      </header>

      <p className="readonly-banner">View only — your DM updates this sheet</p>

      <div className="tab-bar">
        {tabs.map((t) => (
          <button key={t} type="button" className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="sheet-body">
        {tab === 'Stats' && (
          <>
            <section className="panel vitals-panel">
              <div className="panel-title">Vitals</div>
              <Counter label="HP"      current={character.vitals.hp.current}      max={hpStaMax} />
              <Counter label="STA"     current={character.vitals.sta.current}     max={hpStaMax} />
              <Counter label="Resolve" current={character.vitals.resolve.current} max={resolveMax} />
              <div className="vital-row">
                <span className="vital-label">Wound Threshold</span>
                <span className="readonly-value">{character.vitals.woundThreshold}</span>
              </div>
            </section>

            <section className="panel">
              <div className="panel-title">Attributes & Skills</div>
              {Object.entries(ATTRIBUTES).map(([key, attr]) => (
                <div key={key} className="attr-block">
                  <div className={`attr-header attr-header--${key}`}>
                    <span className="attr-icon">{ATTRIBUTE_ICONS[key]}</span>
                    <div className="attr-header-text">
                      <span className="attr-short">{attr.short}</span>
                      <span className="attr-full">{attr.label}</span>
                    </div>
                    <span className="readonly-value attr-value-input">{character.attributes[key] ?? 0}</span>
                  </div>
                  <div className="skill-header-row"><span>Skill</span><span>Lvl</span><span>Base</span></div>
                  {(ATTRIBUTE_SKILLS[key] ?? []).map((skill) => (
                    <div key={skill.key} className={`skill-row${skill.special ? ' special' : ''}`}>
                      <span className="name">{skill.label}</span>
                      <span style={{ textAlign: 'center' }}>{character.skills[key]?.[skill.key]?.level ?? 0}</span>
                      <span className="base">{skillBase(character, key, skill.key)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </section>

            <section className="panel misc-stats">
              <div className="panel-title">Luck</div>
              <div className="luck-bar">
                {Array.from({ length: character.luck?.max ?? 5 }).map((_, i) => (
                  <span key={i} className={`luck-pip luck-pip-static${i < (character.luck?.used ?? 0) ? ' used' : ''}`} />
                ))}
              </div>
              <div className="stat-grid">
                {[
                  ['SPD', character.speed], ['Adrenaline', character.adrenaline],
                  ['RUN', character.movement?.run], ['LEAP', character.movement?.leap],
                  ['STUN', character.recovery?.stun], ['REC', character.recovery?.rec],
                  ['I.P.', character.improvementPoints?.ip], ['Training I.P.', character.improvementPoints?.trainingIp],
                ].map(([l, v]) => (
                  <label key={l as string}>{l as string} <span className="readonly-value">{v as number ?? 0}</span></label>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === 'Combat' && (
          <>
            <section className="panel">
              <div className="panel-title">Weapons</div>
              {!character.weapons?.length ? <p className="readonly-empty">None</p> : (
                <table>
                  <thead>
                    <tr><th>Name</th><th>T</th><th>WA</th><th>DMG</th><th>Hand</th><th>RNG</th><th>Effect</th><th>Wt</th></tr>
                  </thead>
                  <tbody>
                    {character.weapons.map((w, i) => (
                      <tr key={w.id ?? i}>
                        <td>{w.name}</td><td>{w.type}</td><td>{w.wa}</td><td>{w.dmg}</td>
                        <td>{w.hand}</td><td>{w.rng}</td><td>{w.effect}</td><td>{w.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
            <section className="panel">
              <div className="panel-title">Armor</div>
              <table>
                <thead><tr><th>Location</th><th>Piece</th><th>SP</th><th>Dam</th><th>Effects</th><th>Wt</th></tr></thead>
                <tbody>
                  {(character.armor ?? []).map((piece) => (
                    <tr key={piece.slot}>
                      <td>{ARMOR_LABELS[piece.slot] ?? piece.slot}</td>
                      <td>{piece.name || '—'}</td><td>{piece.sp}</td><td>{piece.damage}</td>
                      <td>{piece.effects || '—'}</td><td>{piece.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {character.armorNotes && <p className="readonly-notes">{character.armorNotes}</p>}
            </section>
          </>
        )}

        {tab === 'Inventory' && (
          <section className="panel">
            <div className="panel-title">Consumables</div>
            {!character.consumables?.length ? <p className="readonly-empty">None</p> : (
              <table>
                <thead><tr><th>#</th><th>Name</th><th>Effect</th><th>Wt</th></tr></thead>
                <tbody>
                  {character.consumables.map((item, i) => (
                    <tr key={item.id ?? i}><td>{item.qty}</td><td>{item.name}</td><td>{item.effect}</td><td>{item.weight}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {tab === 'Magic' && showMagic && (
          <>
            {magicSections.map((section) => (
              <section key={section.key} className="panel magic-section">
                <div className="panel-title">{section.label}</div>
                {spellsForCategory(character.spells, section.key).length === 0 ? (
                  <p className="readonly-empty">None</p>
                ) : (
                  <table>
                    <thead><tr><th>Name</th><th>STA</th><th>Range</th><th>Duration</th><th>Effect</th></tr></thead>
                    <tbody>
                      {spellsForCategory(character.spells, section.key).map((s, i) => (
                        <tr key={s.id ?? i}><td>{s.name}</td><td>{s.staCost}</td><td>{s.range}</td><td>{s.duration}</td><td>{s.effect}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            ))}
          </>
        )}

        {tab === 'Other' && (
          <>
            {character.wounds?.length ? (
              <section className="panel">
                <div className="panel-title">Wounds</div>
                <table>
                  <thead><tr><th>Wound</th><th>S/T</th><th>Days</th></tr></thead>
                  <tbody>
                    {character.wounds.map((w, i) => (
                      <tr key={w.id ?? i}><td>{w.description}</td><td>{w.severity}</td><td>{w.days}</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ) : null}
            {character.statusEffects?.length ? (
              <section className="panel">
                <div className="panel-title">Status Effects</div>
                {character.statusEffects.map((e, i) => <p key={e.id ?? i}>{e.description}</p>)}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
