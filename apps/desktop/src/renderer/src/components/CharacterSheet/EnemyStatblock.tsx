import type { Character } from "@wilmak/shared";
import { ATTRIBUTES, ARMOR_LABELS } from "@wilmak/game-data";
import { Counter, NumInput, DynamicTable } from "./helpers";
import type { DynRow } from "./helpers";

interface DerivedStats {
  run: number;
  leap: number;
  stun: number;
  rec: number;
  luckMax: number;
  punch: string | number;
  kick: string | number;
}

interface SkillRow {
  attrKey: string;
  skillKey: string;
  label: string;
  level: number;
  base: number;
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
  update: (patch: Partial<Character>) => void;
  updateNested: (path: string[], value: unknown) => void;
  readOnly: boolean;
  isDM: boolean;
  onChange?: (c: Character) => void;
  atFullHealth: boolean;
  onRest: () => void;
  hpMax: number;
  staMax: number;
  derived: DerivedStats;
  isMonster: boolean;
  isNpcStatblock: boolean;
  skillRows: SkillRow[];
  skillCheckable: boolean;
  onSkillCheck?: (params: { attrKey: string; skillKey: string; skillLabel: string }) => void;
  setPicker: (s: PickerState | null) => void;
}

export default function EnemyStatblock({
  character,
  update,
  updateNested,
  readOnly,
  isDM,
  onChange,
  atFullHealth,
  onRest,
  hpMax,
  staMax,
  derived,
  isMonster,
  isNpcStatblock,
  skillRows,
  skillCheckable,
  onSkillCheck,
  setPicker,
}: Props) {
  const profile = character.monsterProfile!;

  return (
    <div className="enemy-statblock-grid">
      <section className="panel enemy-combat-panel">
        <div className="panel-title-row">
          <div className="panel-title">Combat</div>
          {isDM && onChange && (
            <button
              type="button"
              className="btn-sm sheet-rest-btn"
              onClick={onRest}
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
          {profile.vigor != null && profile.vigor > 0 && (
            <label>
              VIGOR <span className="readonly-value">{profile.vigor}</span>
            </label>
          )}
        </div>
      </section>

      <section className="panel enemy-info-panel">
        <div className="panel-title">{isMonster ? "Monster" : "NPC"}</div>
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
              <dt>Armor</dt>
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
          {profile.encumbrance != null && (
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
            <label key={key} className={`enemy-attr-pill enemy-attr-pill--${key}`}>
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
                <tr
                  key={`${row.attrKey}-${row.skillKey}`}
                  className={skillCheckable ? "skill-row--checkable" : undefined}
                  onClick={
                    skillCheckable
                      ? () =>
                          onSkillCheck?.({
                            attrKey: row.attrKey,
                            skillKey: row.skillKey,
                            skillLabel: row.label,
                          })
                      : undefined
                  }
                  title={skillCheckable ? "Request skill check" : undefined}
                >
                  <td>{row.label}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <NumInput
                      readOnly={readOnly}
                      value={row.level}
                      onChange={(v) =>
                        updateNested(["skills", row.attrKey, row.skillKey, "level"], v)
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
                          weapons[i] = { ...weapons[i], name: e.target.value };
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
                          weapons[i] = { ...weapons[i], dmg: e.target.value };
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
                          weapons[i] = { ...weapons[i], effect: e.target.value };
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
                          weapons[i] = { ...weapons[i], rng: e.target.value };
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
                          weapons[i] = { ...weapons[i], rel: e.target.value };
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

      {profile.vulnerabilities && (
        <section className="panel enemy-vuln-panel">
          <div className="panel-title">Vulnerabilities</div>
          <p className="monster-profile-text">{profile.vulnerabilities}</p>
        </section>
      )}

      {profile.abilities && (
        <section className="panel enemy-abilities-panel">
          <div className="panel-title">Abilities</div>
          <p className="monster-profile-text">{profile.abilities}</p>
        </section>
      )}

      {profile.loot && (
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
                              setPicker({ kind: "armor", slotIndex, slot: piece.slot })
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
                            armor[slotIndex] = { ...armor[slotIndex], sp: v };
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
                update({ wounds: character.wounds!.filter((_, idx) => idx !== i) })
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
                update({ statusEffects: rows as unknown as Character["statusEffects"] })
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
                  statusEffects: character.statusEffects!.filter((_, idx) => idx !== i),
                })
              }
              emptyRow={{ description: "" }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
