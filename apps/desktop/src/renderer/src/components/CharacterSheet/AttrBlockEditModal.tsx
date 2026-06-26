import { useState } from "react";
import Modal from "../Modal";
import Stepper from "../Stepper";
import ValueInputModal from "../ValueInputModal";

export interface SkillEditEntry {
  key: string;
  label: string;
  level: number;
  special?: boolean;
}

interface Props {
  attrShort: string;
  attrLabel: string;
  attrValue: number;
  skills: SkillEditEntry[];
  onConfirm: (attrValue: number, skills: SkillEditEntry[]) => void;
  onClose: () => void;
}

type InlineEdit =
  | { field: "attr" }
  | { field: "skill"; key: string; label: string };

export default function AttrBlockEditModal({
  attrShort,
  attrLabel,
  attrValue,
  skills,
  onConfirm,
  onClose,
}: Props) {
  const [localAttr, setLocalAttr] = useState(attrValue);
  const [localSkills, setLocalSkills] = useState<SkillEditEntry[]>(
    skills.map((s) => ({ ...s })),
  );
  const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null);

  function updateSkill(key: string, level: number) {
    setLocalSkills((prev) => prev.map((s) => (s.key === key ? { ...s, level } : s)));
  }

  function currentSkillLevel(key: string) {
    return localSkills.find((s) => s.key === key)?.level ?? 0;
  }

  return (
    <>
      <Modal
        title={`${attrShort} — ${attrLabel}`}
        size="sm"
        onClose={onClose}
        footer={
          <>
            <button type="button" className="ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => onConfirm(localAttr, localSkills)}
            >
              Apply
            </button>
          </>
        }
      >
        <div className="attr-block-edit-body">
          <div className="attr-block-edit-stat-row">
            <span className="attr-block-edit-stat-label">Stat value</span>
            <Stepper
              value={localAttr}
              min={1}
              max={10}
              onChange={setLocalAttr}
              onValClick={() => setInlineEdit({ field: "attr" })}
            />
          </div>

          {localSkills.length > 0 && (
            <div className="attr-block-edit-skills">
              {localSkills.map((skill) => (
                <div key={skill.key} className="attr-block-edit-skill-row">
                  <span
                    className={`attr-block-edit-skill-name${skill.special ? " special" : ""}`}
                  >
                    {skill.label}
                  </span>
                  <Stepper
                    value={skill.level}
                    min={0}
                    max={10}
                    onChange={(v) => updateSkill(skill.key, v)}
                    onValClick={() =>
                      setInlineEdit({ field: "skill", key: skill.key, label: skill.label })
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {inlineEdit?.field === "attr" && (
        <ValueInputModal
          type="number"
          title={`${attrShort} — ${attrLabel}`}
          initial={localAttr}
          min={1}
          max={10}
          hardBlock
          validate={(v) => (v < 1 || v > 10 ? "Must be 1–10" : null)}
          onConfirm={(v) => {
            setLocalAttr(v);
            setInlineEdit(null);
          }}
          onClose={() => setInlineEdit(null)}
        />
      )}

      {inlineEdit?.field === "skill" && (
        <ValueInputModal
          type="number"
          title={inlineEdit.label}
          initial={currentSkillLevel(inlineEdit.key)}
          min={0}
          max={10}
          hardBlock
          validate={(v) => (v < 0 || v > 10 ? "Must be 0–10" : null)}
          onConfirm={(v) => {
            updateSkill(inlineEdit.key, v);
            setInlineEdit(null);
          }}
          onClose={() => setInlineEdit(null)}
        />
      )}
    </>
  );
}
