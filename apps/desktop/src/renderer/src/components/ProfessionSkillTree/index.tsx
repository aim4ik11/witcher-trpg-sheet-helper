import { useMemo, useState, useEffect } from "react";
import type { Character } from "@wilmak/shared";
import {
  getProfession,
  getProfessionTree,
  buildVisibleTree,
  TREE_DESC_INLINE_MAX,
  TREE_UNLOCK_AT,
  normalizeOccupation,
  spendTreeLevel,
  type ProgressionCharacter,
  type VisibleTreeNode,
} from "@wilmak/game-data";
import "./ProfessionSkillTree.css";

interface LevelInputProps {
  value: number;
  readOnly?: boolean;
  onChange: (v: number) => void;
}

function LevelInput({ value, readOnly, spendMode, onChange }: LevelInputProps & { spendMode?: boolean }) {
  if (readOnly && !spendMode) return <span className="prof-tree-lvl">{value}</span>;
  if (spendMode) {
    return (
      <button type="button" className="spend-btn" onClick={() => onChange(value + 1)}>
        +1
      </button>
    );
  }
  return (
    <div className="prof-tree-lvl-edit">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))}>
        −
      </button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(Math.min(value + 1, 10))}>
        +
      </button>
    </div>
  );
}

interface DescProps {
  text: string;
  onExpand: () => void;
}

function AbilityDescription({ text, onExpand }: DescProps) {
  if (text.length <= TREE_DESC_INLINE_MAX) {
    return <p className="prof-tree-desc">{text}</p>;
  }
  const preview = `${text.slice(0, TREE_DESC_INLINE_MAX).trimEnd()}…`;
  return (
    <p className="prof-tree-desc">
      {preview}{" "}
      <button type="button" className="prof-tree-desc-more" onClick={onExpand}>
        Read full
      </button>
    </p>
  );
}

interface NodeCardProps {
  node: VisibleTreeNode;
  readOnly?: boolean;
  spendMode?: boolean;
  onLevelChange: (level: number) => void;
  onShowDesc: (title: string, text: string) => void;
}

function NodeCard({ node, readOnly, spendMode, onLevelChange, onShowDesc }: NodeCardProps & { spendMode?: boolean }) {
  const title = node.isCore
    ? `${node.ability.name} (${node.ability.stat.toUpperCase()})`
    : node.ability.name;

  return (
    <div
      className={`prof-tree-node${node.isCore ? " prof-tree-node--core" : ""}${
        node.tier === 3 ? " prof-tree-node--apex" : ""
      }`}
    >
      <div className="prof-tree-node-head">
        <span className="prof-tree-node-name">{title}</span>
        <span className="prof-tree-node-stat">{node.ability.stat.toUpperCase()}</span>
      </div>
      <div className="prof-tree-node-stats">
        <LevelInput
          readOnly={readOnly}
          spendMode={spendMode}
          value={node.level}
          onChange={onLevelChange}
        />
        <span className="prof-tree-base">Base {node.base}</span>
      </div>
      <AbilityDescription
        text={node.ability.description}
        onExpand={() => onShowDesc(title, node.ability.description)}
      />
    </div>
  );
}

interface Props {
  character: Character;
  readOnly?: boolean;
  spendMode?: boolean;
  onTreeChange: (tree: Record<string, number>, definingSkillLevel?: number) => void;
  onApply?: (character: Character) => void;
}

export default function ProfessionSkillTree({
  character,
  readOnly,
  spendMode,
  onTreeChange,
  onApply,
}: Props) {
  const occupation = character.occupation || "";
  const profession = useMemo(() => getProfession(occupation), [occupation]);
  const tree = useMemo(() => getProfessionTree(occupation), [occupation]);
  const visible = useMemo(
    () => (tree ? buildVisibleTree(character, tree, occupation) : null),
    [character, tree, occupation],
  );
  const [descModal, setDescModal] = useState<{ title: string; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (!descModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDescModal(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [descModal]);

  if (!profession || !tree || !visible) return null;

  function setLevel(abilityId: string, level: number) {
    if (spendMode && onApply) {
      const current = character.professionTree?.[abilityId] ?? 0;
      if (level <= current) return;
      const result = spendTreeLevel(character as ProgressionCharacter, abilityId);
      if (result.ok) onApply(result.character as Character);
      return;
    }
    const next = { ...(character.professionTree ?? {}), [abilityId]: level };
    const occ = normalizeOccupation(occupation);
    const coreLevel = next[`${occ}:core`];
    onTreeChange(next, coreLevel ?? character.definingSkillLevel);
  }

  return (
    <section className="profession-skills-panel">
      <div className="section-label">Profession skill tree</div>
      {profession.notes && <p className="profession-note">{profession.notes}</p>}
      <div className="profession-meta">
        <span>
          Vigor <strong>{profession.vigor}</strong>
        </span>
        <span className="prof-tree-hint">
          Reach <strong>{TREE_UNLOCK_AT}</strong> in an ability to reveal the next tier on
          that path.
        </span>
      </div>

      <div className="prof-tree">
        <div className="prof-tree-paths">
          {visible.paths.map((path) => (
            <div key={path.pathIndex} className="prof-tree-path">
              <div className="prof-tree-path-label">{path.label}</div>
              <div className="prof-tree-path-col">
                {[...path.tiers].reverse().map((node) => (
                  <div key={node.id} className="prof-tree-tier">
                    <NodeCard
                      node={node}
                      readOnly={readOnly}
                      spendMode={spendMode}
                      onLevelChange={(v) => setLevel(node.id, v)}
                      onShowDesc={(title, text) => setDescModal({ title, text })}
                    />
                    <div className="prof-tree-connector" aria-hidden />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="prof-tree-core-wrap">
          <div className="prof-tree-connector prof-tree-connector--to-core" aria-hidden />
          <NodeCard
            node={visible.core}
            readOnly={readOnly}
            spendMode={spendMode}
            onLevelChange={(v) => setLevel(visible.core!.id, v)}
            onShowDesc={(title, text) => setDescModal({ title, text })}
          />
        </div>
      </div>

      {descModal && (
        <div
          className="prof-tree-modal-backdrop"
          onClick={() => setDescModal(null)}
          role="presentation"
        >
          <div
            className="prof-tree-modal panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="prof-tree-modal-close"
              onClick={() => setDescModal(null)}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="prof-tree-modal-title">{descModal.title}</h3>
            <p className="prof-tree-modal-body">{descModal.text}</p>
          </div>
        </div>
      )}
    </section>
  );
}
