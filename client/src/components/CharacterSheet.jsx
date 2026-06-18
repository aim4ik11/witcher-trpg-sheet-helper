import { useState, useEffect, useMemo } from 'react';
import { ATTRIBUTES, ATTRIBUTE_SKILLS, ARMOR_LABELS, calcVitalMaxes, skillBase } from '../characterData';
import {
  isSpellcastingOccupation,
  getMagicSections,
  spellsForCategory,
  MAGIC_ROW_EMPTY,
} from '../gameOptions';
import {
  WEAPONS_CATALOG,
  catalogToWeapon,
  catalogToArmorPiece,
  catalogToSpell,
  getArmorForSlot,
  getMagicForCategory,
} from '../catalog';
import { RaceSelect, OccupationSelect, RaceOccupationDisplay } from './RaceOccupationSelect';
import { ATTRIBUTE_ICONS } from './AttributeIcons';
import CatalogPickerModal from './CatalogPickerModal';
import './CharacterSheet.css';
import './CatalogPickerModal.css';
import './RaceOccupationSelect.css';

const BASE_TABS = ['Stats', 'Combat', 'Inventory'];

const WEAPON_EMPTY = {
  name: '', type: '', wa: 0, dmg: '', rel: '', hand: '', rng: '',
  effect: '', conc: '', enhancements: '', weight: 0,
};

function Counter({ current, max, onChange, label, readOnly }) {
  return (
    <div className="vital-row">
      <span className="vital-label">{label}</span>
      {readOnly ? (
        <span className="counter-readonly">{current} <span className="max">/ {max}</span></span>
      ) : (
        <div className="counter">
          <button type="button" onClick={() => onChange(Math.max(0, current - 1))}>−</button>
          <span className="value">{current}</span>
          <span className="max">/ {max}</span>
          <button type="button" onClick={() => onChange(Math.min(max, current + 1))}>+</button>
        </div>
      )}
    </div>
  );
}

function NumInput({ value, onChange, className = '', readOnly }) {
  if (readOnly) {
    return <span className={`readonly-value ${className}`}>{value ?? 0}</span>;
  }
  return (
    <input
      type="number"
      className={className}
      value={value ?? 0}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
    />
  );
}

function TextInput({ value, onChange, readOnly, ...props }) {
  if (readOnly) {
    return <span className="readonly-value">{value || '—'}</span>;
  }
  return <input value={value ?? ''} onChange={onChange} {...props} />;
}

function DynamicTable({ columns, rows, onChange, onAdd, onRemove, emptyRow, readOnly, renderAddActions }) {
  if (readOnly && rows.length === 0) {
    return <p className="readonly-empty">None</p>;
  }

  return (
    <div className="dynamic-table-wrap">
      <table className="dynamic-table">
        <thead>
          <tr>
            {columns.map((col) => <th key={col.key}>{col.label}</th>)}
            {!readOnly && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i}>
              {columns.map((col) => (
                <td key={col.key}>
                  {readOnly ? (
                    <span>{row[col.key] ?? (col.type === 'number' ? 0 : '—')}</span>
                  ) : (
                    <input
                      type={col.type === 'number' ? 'number' : 'text'}
                      value={row[col.key] ?? (col.type === 'number' ? 0 : '')}
                      onChange={(e) => {
                        const val = col.type === 'number'
                          ? (parseInt(e.target.value, 10) || 0)
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
                  <button type="button" className="danger" onClick={() => onRemove(i)}>×</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        renderAddActions ? (
          <div className="add-actions">{renderAddActions()}</div>
        ) : (
          <button type="button" className="add-row-btn" onClick={() => onAdd(emptyRow)}>+ Add row</button>
        )
      )}
    </div>
  );
}

export default function CharacterSheet({ character, onChange, isDM, onBack, backLabel }) {
  const [tab, setTab] = useState('Stats');
  const [picker, setPicker] = useState(null);
  const readOnly = !isDM;
  const { hpStaMax, resolveMax } = calcVitalMaxes(character);
  const occupation = character.occupation || character.profession || '';
  const showMagic = isSpellcastingOccupation(occupation);
  const magicSections = useMemo(() => getMagicSections(occupation), [occupation]);

  const tabs = useMemo(() => {
    const list = [...BASE_TABS];
    if (showMagic) list.push('Magic');
    list.push('Other');
    return list;
  }, [showMagic]);

  useEffect(() => {
    if (tab === 'Magic' && !showMagic) setTab('Stats');
  }, [tab, showMagic]);

  function updateSpellsForCategory(category, categoryRows) {
    const others = (character.spells ?? []).filter((s) => (s.category || 'spell') !== category);
    const normalized = categoryRows.map((row) => ({
      ...row,
      id: row.id ?? crypto.randomUUID(),
      category,
    }));
    update({ spells: [...others, ...normalized] });
  }

  function update(patch) {
    if (readOnly) return;
    onChange({ ...character, ...patch });
  }

  function updateNested(path, value) {
    if (readOnly) return;
    const next = structuredClone(character);
    let obj = next;
    for (let i = 0; i < path.length - 1; i++) {
      obj = obj[path[i]];
    }
    obj[path[path.length - 1]] = value;

    if (path[0] === 'attributes') {
      const { hpStaMax: hpMax, resolveMax: resMax } = calcVitalMaxes(next);
      next.vitals.hp.max = hpMax;
      next.vitals.sta.max = hpMax;
      next.vitals.resolve.max = resMax;
    }
    onChange(next);
  }

  function updateVital(key, field, value) {
    updateNested(['vitals', key, field], value);
  }

  return (
    <div className={`sheet${readOnly ? ' sheet-readonly' : ''}`}>
      <header className="sheet-header">
        <button type="button" className="back-btn" onClick={onBack}>{backLabel}</button>
        <div className="sheet-identity">
          {readOnly ? (
            <>
              <h1 className="sheet-name-display">{character.name}</h1>
              <div className="sheet-meta-display">
                <RaceOccupationDisplay race={character.race} occupation={occupation} />
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
                <RaceSelect value={character.race ?? ''} onChange={(v) => update({ race: v })} />
                <OccupationSelect value={occupation} onChange={(v) => update({ occupation: v })} />
                {character.type === 'player' && (
                  <input
                    placeholder="Player nickname"
                    value={character.nickname ?? ''}
                    onChange={(e) => update({ nickname: e.target.value.toLowerCase().replace(/\s/g, '') })}
                    title="Players use this to log in"
                  />
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {readOnly && (
        <p className="readonly-banner">View only — your DM updates this sheet</p>
      )}

      <div className="tab-bar">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="sheet-body">
        {tab === 'Stats' && (
          <>
            <section className="panel vitals-panel">
              <div className="panel-title">Vitals</div>
              <Counter readOnly={readOnly} label="HP" current={character.vitals.hp.current} max={hpStaMax} onChange={(v) => updateVital('hp', 'current', v)} />
              <Counter readOnly={readOnly} label="STA" current={character.vitals.sta.current} max={hpStaMax} onChange={(v) => updateVital('sta', 'current', v)} />
              <Counter readOnly={readOnly} label="Resolve" current={character.vitals.resolve.current} max={resolveMax} onChange={(v) => updateVital('resolve', 'current', v)} />
              <div className="vital-row">
                <span className="vital-label">Wound Threshold</span>
                <NumInput readOnly={readOnly} value={character.vitals.woundThreshold} onChange={(v) => updateNested(['vitals', 'woundThreshold'], v)} />
              </div>
              <p className="formula-hint">HP/STA max: (BODY+WILL)/2×5 · Resolve: (INT+WILL)/2×5</p>
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
                    <NumInput
                      readOnly={readOnly}
                      className="attr-value-input"
                      value={character.attributes[key]}
                      onChange={(v) => updateNested(['attributes', key], v)}
                    />
                  </div>
                  <div className="skill-header-row">
                    <span>Skill</span><span>Lvl</span><span>Base</span>
                  </div>
                  {(ATTRIBUTE_SKILLS[key] ?? []).map((skill) => (
                    <div key={skill.key} className={`skill-row${skill.special ? ' special' : ''}`}>
                      <span className="name">{skill.label}</span>
                      <NumInput readOnly={readOnly} value={character.skills[key]?.[skill.key]?.level ?? 0} onChange={(v) => updateNested(['skills', key, skill.key, 'level'], v)} />
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
                  readOnly ? (
                    <span key={i} className={`luck-pip luck-pip-static${i < (character.luck?.used ?? 0) ? ' used' : ''}`} />
                  ) : (
                    <button
                      key={i}
                      type="button"
                      className={`luck-pip${i < (character.luck?.used ?? 0) ? ' used' : ''}`}
                      onClick={() => {
                        const used = i < (character.luck?.used ?? 0) ? i : i + 1;
                        updateNested(['luck', 'used'], used);
                      }}
                    />
                  )
                ))}
              </div>
              <div className="stat-grid">
                <label>SPD <NumInput readOnly={readOnly} value={character.speed} onChange={(v) => update({ speed: v })} /></label>
                <label>Adrenaline <NumInput readOnly={readOnly} value={character.adrenaline} onChange={(v) => update({ adrenaline: v })} /></label>
                <label>RUN <NumInput readOnly={readOnly} value={character.movement?.run} onChange={(v) => updateNested(['movement', 'run'], v)} /></label>
                <label>LEAP <NumInput readOnly={readOnly} value={character.movement?.leap} onChange={(v) => updateNested(['movement', 'leap'], v)} /></label>
                <label>STUN <NumInput readOnly={readOnly} value={character.recovery?.stun} onChange={(v) => updateNested(['recovery', 'stun'], v)} /></label>
                <label>REC <NumInput readOnly={readOnly} value={character.recovery?.rec} onChange={(v) => updateNested(['recovery', 'rec'], v)} /></label>
                <label>I.P. <NumInput readOnly={readOnly} value={character.improvementPoints?.ip} onChange={(v) => updateNested(['improvementPoints', 'ip'], v)} /></label>
                <label>Training I.P. <NumInput readOnly={readOnly} value={character.improvementPoints?.trainingIp} onChange={(v) => updateNested(['improvementPoints', 'trainingIp'], v)} /></label>
              </div>
            </section>
          </>
        )}

        {tab === 'Combat' && (
          <>
            <section className="panel">
              <div className="panel-title">Weapons</div>
              <DynamicTable
                readOnly={readOnly}
                columns={[
                  { key: 'name', label: 'Name' }, { key: 'type', label: 'T' },
                  { key: 'wa', label: 'WA', type: 'number' }, { key: 'dmg', label: 'DMG' },
                  { key: 'rel', label: 'Rel' }, { key: 'hand', label: 'Hand' },
                  { key: 'rng', label: 'RNG' }, { key: 'effect', label: 'Effect' },
                  { key: 'conc', label: 'Conc.' }, { key: 'enhancements', label: 'EN' },
                  { key: 'weight', label: 'Wt', type: 'number' },
                ]}
                rows={character.weapons ?? []}
                onChange={(rows) => update({ weapons: rows })}
                onAdd={() => {}}
                onRemove={(i) => update({ weapons: character.weapons.filter((_, idx) => idx !== i) })}
                emptyRow={WEAPON_EMPTY}
                renderAddActions={() => (
                  <button type="button" className="primary" onClick={() => setPicker({ kind: 'weapon' })}>
                    + Add from catalog
                  </button>
                )}
              />
            </section>

            <section className="panel bonus-melee">
              <div className="panel-title">Bonus Melee</div>
              <div className="stat-grid">
                <label>Punch <TextInput readOnly={readOnly} value={character.bonusMelee?.punch ?? ''} onChange={(e) => updateNested(['bonusMelee', 'punch'], e.target.value)} /></label>
                <label>Kick <TextInput readOnly={readOnly} value={character.bonusMelee?.kick ?? ''} onChange={(e) => updateNested(['bonusMelee', 'kick'], e.target.value)} /></label>
              </div>
            </section>

            <section className="panel">
              <div className="panel-title">Armor</div>
              <table>
                <thead>
                  <tr><th>Location</th><th>Piece</th><th>SP</th><th>Dam</th><th>Effects</th><th>Wt</th></tr>
                </thead>
                <tbody>
                  {(character.armor ?? []).map((piece, i) => (
                    <tr key={piece.slot}>
                      <td>{ARMOR_LABELS[piece.slot] ?? piece.slot}</td>
                      <td>
                        <div className="armor-name-cell">
                          {piece.name && <span className="armor-piece-name">{piece.name}</span>}
                          {!readOnly && (
                            <button
                              type="button"
                              className="armor-pick-btn"
                              onClick={() => setPicker({ kind: 'armor', slotIndex: i, slot: piece.slot })}
                            >
                              {piece.name ? 'Change' : 'Pick armor'}
                            </button>
                          )}
                          {readOnly && !piece.name && <span className="readonly-value">—</span>}
                        </div>
                      </td>
                      <td><NumInput readOnly={readOnly} value={piece.sp} onChange={(v) => { const armor = [...character.armor]; armor[i] = { ...armor[i], sp: v }; update({ armor }); }} /></td>
                      <td><NumInput readOnly={readOnly} value={piece.damage} onChange={(v) => { const armor = [...character.armor]; armor[i] = { ...armor[i], damage: v }; update({ armor }); }} /></td>
                      <td><TextInput readOnly={readOnly} value={piece.effects ?? ''} onChange={(e) => { const armor = [...character.armor]; armor[i] = { ...armor[i], effects: e.target.value }; update({ armor }); }} /></td>
                      <td><NumInput readOnly={readOnly} value={piece.weight} onChange={(v) => { const armor = [...character.armor]; armor[i] = { ...armor[i], weight: v }; update({ armor }); }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {readOnly ? (
                character.armorNotes ? <p className="readonly-notes">{character.armorNotes}</p> : null
              ) : (
                <textarea className="armor-notes" placeholder="Armor notes..." value={character.armorNotes ?? ''} onChange={(e) => update({ armorNotes: e.target.value })} rows={2} />
              )}
            </section>
          </>
        )}

        {tab === 'Inventory' && (
          <section className="panel">
            <div className="panel-title">Ammo, Bombs, Potions, Traps</div>
            <DynamicTable readOnly={readOnly} columns={[
              { key: 'qty', label: '#', type: 'number' }, { key: 'name', label: 'Name' },
              { key: 'effect', label: 'Effect' }, { key: 'weight', label: 'Wt', type: 'number' },
            ]} rows={character.consumables ?? []} onChange={(rows) => update({ consumables: rows })}
            onAdd={(empty) => update({ consumables: [...(character.consumables ?? []), { ...empty, id: crypto.randomUUID() }] })}
            onRemove={(i) => update({ consumables: character.consumables.filter((_, idx) => idx !== i) })}
            emptyRow={{ qty: 0, name: '', effect: '', weight: 0 }} />
          </section>
        )}

        {tab === 'Magic' && showMagic && (
          <>
            {magicSections.map((section) => (
              <section key={section.key} className="panel magic-section">
                <div className="panel-title">{section.label}</div>
                <DynamicTable
                  readOnly={readOnly}
                  columns={[
                    { key: 'name', label: 'Name' },
                    { key: 'staCost', label: 'STA', type: 'number' },
                    { key: 'range', label: 'Range' },
                    { key: 'duration', label: 'Duration' },
                    { key: 'effect', label: 'Effect' },
                  ]}
                  rows={spellsForCategory(character.spells, section.key)}
                  onChange={(rows) => updateSpellsForCategory(section.key, rows)}
                  onAdd={() => {}}
                  onRemove={(i) => {
                    const rows = spellsForCategory(character.spells, section.key);
                    updateSpellsForCategory(section.key, rows.filter((_, idx) => idx !== i));
                  }}
                  emptyRow={{ ...MAGIC_ROW_EMPTY }}
                  renderAddActions={() => (
                    <button
                      type="button"
                      className="primary"
                      onClick={() => setPicker({ kind: 'magic', category: section.key, label: section.label })}
                    >
                      + Add from catalog
                    </button>
                  )}
                />
              </section>
            ))}
          </>
        )}

        {tab === 'Other' && (
          <>
            <section className="panel">
              <div className="panel-title">Profession Abilities</div>
              <DynamicTable readOnly={readOnly} columns={[
                { key: 'name', label: 'Name' }, { key: 'stat', label: 'Stat' },
                { key: 'level', label: 'Lvl', type: 'number' }, { key: 'base', label: 'Base', type: 'number' },
              ]} rows={character.professionAbilities ?? []} onChange={(rows) => update({ professionAbilities: rows })}
              onAdd={(empty) => update({ professionAbilities: [...(character.professionAbilities ?? []), { ...empty, id: crypto.randomUUID() }] })}
              onRemove={(i) => update({ professionAbilities: character.professionAbilities.filter((_, idx) => idx !== i) })}
              emptyRow={{ name: '', stat: '', level: 0, base: 0 }} />
            </section>

            <section className="panel">
              <div className="panel-title">Wounds</div>
              <DynamicTable readOnly={readOnly} columns={[
                { key: 'description', label: 'Wound' }, { key: 'severity', label: 'S/T' },
                { key: 'days', label: 'Days', type: 'number' },
              ]} rows={character.wounds ?? []} onChange={(rows) => update({ wounds: rows })}
              onAdd={(empty) => update({ wounds: [...(character.wounds ?? []), { ...empty, id: crypto.randomUUID() }] })}
              onRemove={(i) => update({ wounds: character.wounds.filter((_, idx) => idx !== i) })}
              emptyRow={{ description: '', severity: '', days: 0 }} />
            </section>

            <section className="panel">
              <div className="panel-title">Status Effects</div>
              <DynamicTable readOnly={readOnly} columns={[{ key: 'description', label: 'Effect' }]}
              rows={character.statusEffects ?? []} onChange={(rows) => update({ statusEffects: rows })}
              onAdd={(empty) => update({ statusEffects: [...(character.statusEffects ?? []), { ...empty, id: crypto.randomUUID() }] })}
              onRemove={(i) => update({ statusEffects: character.statusEffects.filter((_, idx) => idx !== i) })}
              emptyRow={{ description: '' }} />
            </section>
          </>
        )}
      </div>

      {picker?.kind === 'weapon' && (
        <CatalogPickerModal
          title="Add Weapon"
          items={WEAPONS_CATALOG}
          onSelect={(item) => {
            update({ weapons: [...(character.weapons ?? []), catalogToWeapon(item)] });
            setPicker(null);
          }}
          onCustom={() => {
            update({ weapons: [...(character.weapons ?? []), { ...WEAPON_EMPTY, id: crypto.randomUUID() }] });
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}

      {picker?.kind === 'magic' && (
        <CatalogPickerModal
          title={`Add ${picker.label}`}
          items={getMagicForCategory(picker.category)}
          onSelect={(item) => {
            updateSpellsForCategory(picker.category, [
              ...spellsForCategory(character.spells, picker.category),
              catalogToSpell(item, picker.category),
            ]);
            setPicker(null);
          }}
          onCustom={() => {
            updateSpellsForCategory(picker.category, [
              ...spellsForCategory(character.spells, picker.category),
              { ...MAGIC_ROW_EMPTY, id: crypto.randomUUID(), category: picker.category },
            ]);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}

      {picker?.kind === 'armor' && (
        <CatalogPickerModal
          title={`Armor — ${ARMOR_LABELS[picker.slot] ?? picker.slot}`}
          items={getArmorForSlot(picker.slot)}
          onSelect={(item) => {
            const armor = [...character.armor];
            armor[picker.slotIndex] = {
              ...armor[picker.slotIndex],
              ...catalogToArmorPiece(item, picker.slot),
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
