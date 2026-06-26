import { useState } from "react";
import type { Character } from "@wilmak/shared";
import { ATTRIBUTES, ATTRIBUTE_SKILLS, skillBase } from "@wilmak/game-data";
import ProfessionSkillTree from "../ProfessionSkillTree";
import { SkillSpendButton, StatSpendButton } from "../PlayerProgressionPanel";
import AttrBlockEditModal from "./AttrBlockEditModal";
import type { SkillEditEntry } from "./AttrBlockEditModal";
import { NumInput } from "./helpers";

// LUCK is displayed in CharacterInfoBar; BODY and SPD go in the compact bottom row
const COMPACT_ATTR_KEYS = ["body", "spd"];
const SKIP_ATTR_KEYS = ["luck"];

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
  playerCanSpend: boolean;
  skillCheckable: boolean;
  derived: DerivedStats;
  isBestiary: boolean;
  derivedLocked: boolean;
  onChange?: (c: Character) => void;
  onSkillCheck?: (params: { attrKey: string; skillKey: string; skillLabel: string }) => void;
}

interface AttrEditState {
  key: string;
  short: string;
  label: string;
  attrValue: number;
  skills: SkillEditEntry[];
}

export default function StatsTab({
  character,
  update,
  updateNested,
  readOnly,
  isDM,
  playerCanSpend,
  skillCheckable,
  derived,
  isBestiary,
  derivedLocked,
  onChange,
  onSkillCheck,
}: Props) {
  const [subTab, setSubTab] = useState<"attrs" | "tree">("attrs");
  const [attrEdit, setAttrEdit] = useState<AttrEditState | null>(null);

  const profile = character.monsterProfile;
  const isMonster = character.enemyKind === "monster";
  const isEnemyStatblock = character.type === "enemy" && !!profile;

  function openSkillCheck(attrKey: string, skillKey: string, skillLabel: string) {
    onSkillCheck?.({ attrKey, skillKey, skillLabel });
  }

  const mainAttrEntries = Object.entries(ATTRIBUTES).filter(
    ([k]) => !COMPACT_ATTR_KEYS.includes(k) && !SKIP_ATTR_KEYS.includes(k),
  );
  const compactAttrEntries = Object.entries(ATTRIBUTES).filter(([k]) =>
    COMPACT_ATTR_KEYS.includes(k),
  );

  function renderAttrBlock([key, attr]: [string, { key: string; label: string; short: string }]) {
    const skills = ATTRIBUTE_SKILLS[key] ?? [];
    return (
      <div key={key} className="attr-block">
        <div className={`attr-header attr-header--${key}`}>
          <div className="attr-header-text">
            <span className="attr-short">{attr.short}</span>
            <span className="attr-full">{attr.label}</span>
          </div>
          <span className="readonly-value attr-value-input">
            {character.attributes[key] ?? 0}
          </span>
          {playerCanSpend && onChange && (
            <StatSpendButton character={character} attrKey={key} onApply={onChange} />
          )}
          {isDM && (
            <button
              type="button"
              className="attr-edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                setAttrEdit({
                  key,
                  short: attr.short,
                  label: attr.label,
                  attrValue: character.attributes[key] ?? 1,
                  skills: (ATTRIBUTE_SKILLS[key] ?? []).map((s) => ({
                    key: s.key,
                    label: s.label,
                    level: character.skills[key]?.[s.key]?.level ?? 0,
                    special: s.special,
                  })),
                });
              }}
              title={`Edit ${attr.label}`}
            >
              ✎
            </button>
          )}
        </div>
        {skills.map((skill) => {
          const level = character.skills[key]?.[skill.key]?.level ?? 0;
          return (
            <div
              key={skill.key}
              className={`skill-row${skill.special ? " special" : ""}${skillCheckable ? " skill-row--checkable" : ""}`}
              role={skillCheckable ? "button" : undefined}
              tabIndex={skillCheckable ? 0 : undefined}
              title={skillCheckable ? "Request skill check" : undefined}
              onClick={skillCheckable ? () => openSkillCheck(key, skill.key, skill.label) : undefined}
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
                <span className="skill-lvl"> · {level}</span>
                {playerCanSpend && onChange && (
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
    );
  }

  return (
    <>
      {profile && !isEnemyStatblock && (
        <section className="panel monster-profile-panel">
          <div className="panel-title">
            {isMonster ? "Monster" : "NPC"} — {profile.monsterType}
          </div>
          <dl className="monster-profile-grid">
            {profile.threat && (<><dt>Threat</dt><dd>{profile.threat}</dd></>)}
            {profile.bounty != null && profile.bounty > 0 && (<><dt>Bounty</dt><dd>{profile.bounty}</dd></>)}
            {profile.naturalArmor != null && (<><dt>Natural armor</dt><dd>{profile.naturalArmor} SP</dd></>)}
            {profile.height && (<><dt>Height</dt><dd>{profile.height}</dd></>)}
            {profile.weight && (<><dt>Weight</dt><dd>{profile.weight}</dd></>)}
            {profile.environment && (<><dt>Environment</dt><dd>{profile.environment}</dd></>)}
            {profile.intelligence && (<><dt>Intelligence</dt><dd>{profile.intelligence}</dd></>)}
            {profile.organization && (<><dt>Organization</dt><dd>{profile.organization}</dd></>)}
            {profile.vigor != null && (<><dt>Vigor</dt><dd>{profile.vigor}</dd></>)}
            {profile.encumbrance != null && (<><dt>Encumbrance</dt><dd>{profile.encumbrance}</dd></>)}
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

      {/* Movement & recovery — compact, at the top */}
      <section className="panel derived-top-panel">
        <div className="derived-compact-grid">
          {(
            [
              { label: "RUN", value: derived.run, path: ["movement", "run"] },
              { label: "LEAP", value: derived.leap, path: ["movement", "leap"] },
              { label: "STUN", value: derived.stun, path: ["recovery", "stun"] },
              { label: "REC", value: derived.rec, path: ["recovery", "rec"] },
            ] as { label: string; value: number; path: string[] }[]
          ).map(({ label, value, path }) => (
            <div key={label} className="derived-chip">
              <span className="derived-chip-label">{label}</span>
              {!derivedLocked && isDM ? (
                <NumInput
                  value={value}
                  onChange={(v) => updateNested(path, v)}
                />
              ) : (
                <span className="derived-chip-value">{value}</span>
              )}
            </div>
          ))}
          <div className="derived-chip">
            <span className="derived-chip-label">Punch</span>
            <span className="derived-chip-value">{derived.punch}</span>
          </div>
          <div className="derived-chip">
            <span className="derived-chip-label">Kick</span>
            <span className="derived-chip-value">{derived.kick}</span>
          </div>
        </div>
        {isBestiary && (
          <p className="formula-hint">Stats from rulebook bestiary — HP/STA/RUN/LEAP/STUN/REC as printed.</p>
        )}
      </section>

      {/* Sub-tabs */}
      <div className="stats-subtabs">
        <button
          type="button"
          className={`stats-subtab-btn${subTab === "attrs" ? " active" : ""}`}
          onClick={() => setSubTab("attrs")}
        >
          Attributes & Skills
        </button>
        <button
          type="button"
          className={`stats-subtab-btn${subTab === "tree" ? " active" : ""}`}
          onClick={() => setSubTab("tree")}
        >
          Skill Tree
        </button>
      </div>

      {subTab === "attrs" && (
        <section>
          <div className="attr-grid">
            {mainAttrEntries.map(renderAttrBlock)}
            {compactAttrEntries.length > 0 && (
              <div className="attr-compact-row">
                {compactAttrEntries.map(renderAttrBlock)}
              </div>
            )}
          </div>
        </section>
      )}

      {subTab === "tree" && (
        <ProfessionSkillTree
          character={character}
          readOnly={!isDM && !playerCanSpend}
          spendMode={playerCanSpend}
          onTreeChange={(professionTree, definingSkillLevel) =>
            update({
              professionTree,
              ...(definingSkillLevel != null ? { definingSkillLevel } : {}),
            })
          }
          onApply={(c) => onChange?.(c)}
        />
      )}

      {attrEdit && (
        <AttrBlockEditModal
          attrShort={attrEdit.short}
          attrLabel={attrEdit.label}
          attrValue={attrEdit.attrValue}
          skills={attrEdit.skills}
          onConfirm={(newAttrValue, newSkills) => {
            if (!onChange) return;
            const next = structuredClone(character);
            next.attributes[attrEdit.key] = newAttrValue;
            for (const s of newSkills) {
              if (!next.skills[attrEdit.key]) next.skills[attrEdit.key] = {};
              if (!next.skills[attrEdit.key][s.key])
                next.skills[attrEdit.key][s.key] = { level: 0 };
              next.skills[attrEdit.key][s.key].level = s.level;
            }
            onChange(next);
            setAttrEdit(null);
          }}
          onClose={() => setAttrEdit(null)}
        />
      )}
    </>
  );
}
