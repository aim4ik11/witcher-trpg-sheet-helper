import { useEffect, useMemo, useRef, useState } from "react";
import type { Character } from "@wilmak/shared";
import { ATTRIBUTES, ATTRIBUTE_SKILLS, skillBase } from "@wilmak/game-data";
import ProfessionSkillTree from "../ProfessionSkillTree";
import { SkillSpendButton, StatSpendButton } from "../PlayerProgressionPanel";

const COMPACT_ATTR_KEYS = ["body", "spd"];
const SKIP_ATTR_KEYS = ["luck"];

interface DerivedStats {
  run: number;
  leap: number;
  stun: number;
  rec: number;
  punch: string | number;
  kick: string | number;
}

interface Props {
  character: Character;
  derived: DerivedStats;
  playerCanSpend: boolean;
  onChange?: (c: Character) => void;
  navKey?: string | null;
  onNavConsumed?: () => void;
}

interface AttrBlockProps {
  attrKey: string;
  attr: { key: string; label: string; short: string };
  character: Character;
  playerCanSpend: boolean;
  onChange?: (c: Character) => void;
  highlighted?: boolean;
  attrRef?: (el: HTMLDivElement | null) => void;
}

function AttrBlock({
  attrKey,
  attr,
  character,
  playerCanSpend,
  onChange,
  highlighted,
  attrRef,
}: AttrBlockProps) {
  const skills = ATTRIBUTE_SKILLS[attrKey] ?? [];
  return (
    <div
      ref={attrRef}
      className={`attr-block${highlighted ? " attr-block--highlighted" : ""}`}
    >
      <div className={`attr-header attr-header--${attrKey}`}>
        <div className="attr-header-text">
          <span className="attr-short">{attr.short}</span>
          <span className="attr-full">{attr.label}</span>
        </div>
        <span className="readonly-value attr-value-input">
          {character.attributes[attrKey] ?? 0}
        </span>
        {playerCanSpend && onChange && (
          <StatSpendButton character={character} attrKey={attrKey} onApply={onChange} />
        )}
      </div>
      {skills.map((skill) => {
        const level = character.skills[attrKey]?.[skill.key]?.level ?? 0;
        return (
          <div key={skill.key} className={`skill-row${skill.special ? " special" : ""}`}>
            <span className="name">
              {skill.label}
              <span className="skill-lvl"> · {level}</span>
              {playerCanSpend && onChange && (
                <SkillSpendButton
                  character={character}
                  attrKey={attrKey}
                  skillKey={skill.key}
                  label={skill.label}
                  special={skill.special}
                  onApply={onChange}
                />
              )}
            </span>
            <span className="base">{skillBase(character, attrKey, skill.key)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsTab({
  character,
  derived,
  playerCanSpend,
  onChange,
  navKey,
  onNavConsumed,
}: Props) {
  const [subTab, setSubTab] = useState<"attrs" | "tree">("attrs");
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  const attrBlockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingScrollKey = useRef<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scrollAndHighlight(key: string) {
    requestAnimationFrame(() => {
      attrBlockRefs.current.get(key)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedKey(key);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightedKey(null), 2000);
      onNavConsumed?.();
    });
  }

  // When navKey arrives: switch sub-tab if needed, then scroll+highlight
  useEffect(() => {
    if (!navKey) return;
    if (subTab !== "attrs") {
      pendingScrollKey.current = navKey;
      setSubTab("attrs");
    } else {
      scrollAndHighlight(navKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navKey]);

  // After sub-tab switches to "attrs", flush any pending scroll
  useEffect(() => {
    if (pendingScrollKey.current && subTab === "attrs") {
      const key = pendingScrollKey.current;
      pendingScrollKey.current = null;
      scrollAndHighlight(key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab]);

  const mainAttrEntries = useMemo(
    () =>
      Object.entries(ATTRIBUTES).filter(
        ([k]) => !COMPACT_ATTR_KEYS.includes(k) && !SKIP_ATTR_KEYS.includes(k),
      ),
    [],
  );
  const compactAttrEntries = useMemo(
    () => Object.entries(ATTRIBUTES).filter(([k]) => COMPACT_ATTR_KEYS.includes(k)),
    [],
  );

  function makeRef(key: string) {
    return (el: HTMLDivElement | null) => {
      if (el) attrBlockRefs.current.set(key, el);
      else attrBlockRefs.current.delete(key);
    };
  }

  return (
    <>
      <section className="panel derived-top-panel">
        <div className="derived-compact-grid">
          {(
            [
              { label: "RUN", value: derived.run },
              { label: "LEAP", value: derived.leap },
              { label: "STUN", value: derived.stun },
              { label: "REC", value: derived.rec },
              { label: "Punch", value: derived.punch },
              { label: "Kick", value: derived.kick },
            ] as { label: string; value: string | number }[]
          ).map(({ label, value }) => (
            <div key={label} className="derived-chip">
              <span className="derived-chip-label">{label}</span>
              <span className="derived-chip-value">{value}</span>
            </div>
          ))}
        </div>
      </section>

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
            {mainAttrEntries.map(([key, attr]) => (
              <AttrBlock
                key={key}
                attrKey={key}
                attr={attr}
                character={character}
                playerCanSpend={playerCanSpend}
                onChange={onChange}
                highlighted={highlightedKey === key}
                attrRef={makeRef(key)}
              />
            ))}
            {compactAttrEntries.length > 0 && (
              <div className="attr-compact-row">
                {compactAttrEntries.map(([key, attr]) => (
                  <AttrBlock
                    key={key}
                    attrKey={key}
                    attr={attr}
                    character={character}
                    playerCanSpend={playerCanSpend}
                    onChange={onChange}
                    highlighted={highlightedKey === key}
                    attrRef={makeRef(key)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {subTab === "tree" && (
        <ProfessionSkillTree
          character={character}
          readOnly={!playerCanSpend}
          spendMode={playerCanSpend}
          onTreeChange={() => {}}
          onApply={onChange}
        />
      )}
    </>
  );
}
