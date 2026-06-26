import type { Character } from "@wilmak/shared";
import {
  ATTRIBUTES,
  ATTRIBUTE_SKILLS,
  skillBase,
} from "@wilmak/game-data";
import ProfessionSkillTree from "../ProfessionSkillTree";
import {
  SkillSpendButton,
  StatSpendButton,
} from "../PlayerProgressionPanel";
import Stepper from "../Stepper";
import { Counter, NumInput } from "./helpers";

interface DerivedStats {
  run: number;
  leap: number;
  stun: number;
  rec: number;
  luckMax: number;
  punch: string | number;
  kick: string | number;
}

interface Props {
  character: Character;
  update: (patch: Partial<Character>) => void;
  updateNested: (path: string[], value: unknown) => void;
  readOnly: boolean;
  isDM: boolean;
  statsEditable: boolean;
  attrReadOnly: boolean;
  playerCanSpend: boolean;
  skillCheckable: boolean;
  hpMax: number;
  staMax: number;
  derived: DerivedStats;
  isBestiary: boolean;
  derivedLocked: boolean;
  atFullHealth: boolean;
  onChange?: (c: Character) => void;
  onRest: () => void;
  onSkillCheck?: (params: { attrKey: string; skillKey: string; skillLabel: string }) => void;
}

export default function StatsTab({
  character,
  update,
  updateNested,
  readOnly,
  isDM,
  statsEditable,
  attrReadOnly,
  playerCanSpend,
  skillCheckable,
  hpMax,
  staMax,
  derived,
  isBestiary,
  derivedLocked,
  atFullHealth,
  onChange,
  onRest,
  onSkillCheck,
}: Props) {
  const profile = character.monsterProfile;
  const isMonster = character.enemyKind === "monster";
  const isEnemyStatblock = character.type === "enemy" && !!profile;

  function openSkillCheck(attrKey: string, skillKey: string, skillLabel: string) {
    onSkillCheck?.({ attrKey, skillKey, skillLabel });
  }

  return (
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
              <p className="monster-profile-text">{profile.vulnerabilities}</p>
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
              onClick={onRest}
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
            ...(definingSkillLevel != null ? { definingSkillLevel } : {}),
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
                    className={`skill-row${skill.special ? " special" : ""}${skillCheckable ? " skill-row--checkable" : ""}`}
                    role={skillCheckable ? "button" : undefined}
                    tabIndex={skillCheckable ? 0 : undefined}
                    title={skillCheckable ? "Request skill check" : undefined}
                    onClick={
                      skillCheckable
                        ? () => openSkillCheck(key, skill.key, skill.label)
                        : undefined
                    }
                    onKeyDown={
                      skillCheckable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openSkillCheck(key, skill.key, skill.label);
                            }
                          }
                        : undefined
                    }
                  >
                    <span className="name">
                      {skill.label}
                      {statsEditable ? (
                        <span
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          {" · "}
                          <Stepper
                            className="skill-stepper"
                            value={level}
                            min={0}
                            max={10}
                            onChange={(v) =>
                              updateNested(["skills", key, skill.key, "level"], v)
                            }
                          />
                        </span>
                      ) : (
                        <span className="skill-lvl"> · {level}</span>
                      )}
                      {!statsEditable && playerCanSpend && onChange && (
                        <span
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <SkillSpendButton
                            character={character}
                            attrKey={key}
                            skillKey={skill.key}
                            label={skill.label}
                            special={skill.special}
                            onApply={onChange}
                          />
                        </span>
                      )}
                    </span>
                    <span className="base">{skillBase(character, key, skill.key)}</span>
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
                      const used = i < (character.luck?.used ?? 0) ? i : i + 1;
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
              onChange={(v) => updateNested(["improvementPoints", "trainingIp"], v)}
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
  );
}
