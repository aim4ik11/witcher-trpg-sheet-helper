import { useState } from "react";
import type { Character } from "@wilmak/shared";
import {
  RaceSelect,
  OccupationSelect,
  RaceOccupationDisplay,
  occupationAfterRaceChange,
} from "../RaceOccupationSelect";
import ValueInputModal from "../ValueInputModal";

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
  isDM: boolean;
  hpMax: number;
  staMax: number;
  derived: DerivedStats;
  atFullHealth: boolean;
  onRest: () => void;
  updateNested: (path: string[], value: unknown) => void;
  update: (patch: Partial<Character>) => void;
  isPlayerSheet: boolean;
  isMonster: boolean;
  isEnemyStatblock: boolean;
}

type ModalField = "level" | "ip" | "trainingIp" | "nickname";

function hpColorClass(current: number, max: number): "high" | "medium" | "low" {
  if (max === 0) return "low";
  const pct = current / max;
  if (pct > 0.6) return "high";
  if (pct > 0.25) return "medium";
  return "low";
}

interface VitalBarProps {
  label: string;
  current: number;
  max: number;
  canEdit: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
}

function VitalBar({ label, current, max, canEdit, onDecrement, onIncrement }: VitalBarProps) {
  const color = hpColorClass(current, max);
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  return (
    <div className="vital-bar-group">
      <span className="vital-bar-label">{label}</span>
      <div className="hp-bar-track">
        <div className={`hp-bar-fill hp-bar-fill--${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="vital-bar-controls">
        {canEdit && (
          <button type="button" className="vital-adj-btn" onClick={onDecrement}>
            −
          </button>
        )}
        <span className="vital-bar-val">
          <span className="vital-current">{current}</span>
          <span className="vital-sep">/</span>
          <span className="vital-max">{max}</span>
        </span>
        {canEdit && (
          <button type="button" className="vital-adj-btn" onClick={onIncrement}>
            +
          </button>
        )}
      </div>
    </div>
  );
}

export default function CharacterInfoBar({
  character,
  isDM,
  hpMax,
  staMax,
  derived,
  atFullHealth,
  onRest,
  updateNested,
  update,
  isPlayerSheet,
  isMonster,
  isEnemyStatblock,
}: Props) {
  const [modal, setModal] = useState<ModalField | null>(null);

  const canEdit = isDM;
  const ip = character.improvementPoints?.ip ?? 0;
  const trainingIp = character.improvementPoints?.trainingIp ?? 0;
  const level = character.creation?.level ?? 1;
  const luckUsed = character.luck?.used ?? 0;
  const luckMax = derived.luckMax || character.luck?.max || 0;
  const occupation = character.occupation || "";
  const profile = character.monsterProfile;

  const showIdentity = !isEnemyStatblock;

  return (
    <div className="char-info-bar">
      {/* Identity row */}
      {showIdentity && (
        <div className="char-info-identity">
          {isMonster && profile?.monsterType ? (
            <span className="identity-badge">{profile.monsterType}</span>
          ) : isDM && isPlayerSheet ? (
            <>
              <div className="identity-select-wrap">
                <RaceSelect
                  value={character.race ?? ""}
                  onChange={(v) => {
                    const occ = occupationAfterRaceChange(v, character.occupation ?? "");
                    update({ race: v, occupation: occ });
                  }}
                />
              </div>
              <span className="identity-sep">·</span>
              <div className="identity-select-wrap">
                <OccupationSelect
                  race={character.race ?? ""}
                  value={occupation}
                  onChange={(v) => update({ occupation: v })}
                />
              </div>
              <span className="identity-sep">·</span>
              <button
                type="button"
                className="identity-nick-btn"
                onClick={() => setModal("nickname")}
              >
                @{character.nickname || "nickname"}
              </button>
            </>
          ) : (
            <>
              <RaceOccupationDisplay race={character.race} occupation={occupation} />
              {character.nickname && (
                <span className="identity-nick">@{character.nickname}</span>
              )}
            </>
          )}
        </div>
      )}

      {/* Vitals row */}
      <div className="char-info-vitals">
        {isPlayerSheet && character.creation?.complete && (
          <div
            className="level-badge"
            role={canEdit ? "button" : undefined}
            onClick={canEdit ? () => setModal("level") : undefined}
            title={canEdit ? "Edit level" : undefined}
          >
            <span className="level-badge-label">LVL</span>
            <span className="level-badge-value">{level}</span>
          </div>
        )}

        <VitalBar
          label="HP"
          current={character.vitals.hp.current}
          max={hpMax}
          canEdit={canEdit}
          onDecrement={() =>
            updateNested(
              ["vitals", "hp", "current"],
              Math.max(0, character.vitals.hp.current - 1),
            )
          }
          onIncrement={() =>
            updateNested(
              ["vitals", "hp", "current"],
              Math.min(hpMax, character.vitals.hp.current + 1),
            )
          }
        />

        <VitalBar
          label="STA"
          current={character.vitals.sta.current}
          max={staMax}
          canEdit={canEdit}
          onDecrement={() =>
            updateNested(
              ["vitals", "sta", "current"],
              Math.max(0, character.vitals.sta.current - 1),
            )
          }
          onIncrement={() =>
            updateNested(
              ["vitals", "sta", "current"],
              Math.min(staMax, character.vitals.sta.current + 1),
            )
          }
        />

        <div className="info-chip info-chip--static">
          <span className="chip-label">WT</span>
          <span className="chip-value">{character.vitals.woundThreshold}</span>
        </div>

        {canEdit && (
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

      {/* Resources row */}
      <div className="char-info-resources">
        {luckMax > 0 && (
          <div className="luck-group">
            <span className="luck-group-label">Luck</span>
            <div className="luck-bar">
              {Array.from({ length: luckMax }).map((_, i) =>
                canEdit ? (
                  <button
                    key={i}
                    type="button"
                    className={`luck-pip${i < luckUsed ? " used" : ""}`}
                    onClick={() => {
                      const used = i < luckUsed ? i : i + 1;
                      updateNested(["luck", "used"], used);
                    }}
                  />
                ) : (
                  <span
                    key={i}
                    className={`luck-pip luck-pip-static${i < luckUsed ? " used" : ""}`}
                  />
                ),
              )}
            </div>
          </div>
        )}

        {isPlayerSheet && (
          <>
            <div
              className="info-chip"
              role={canEdit ? "button" : undefined}
              onClick={canEdit ? () => setModal("ip") : undefined}
            >
              <span className="chip-label">I.P.</span>
              <span className="chip-value">{ip}</span>
            </div>
            <div
              className="info-chip"
              role={canEdit ? "button" : undefined}
              onClick={canEdit ? () => setModal("trainingIp") : undefined}
            >
              <span className="chip-label">Train. I.P.</span>
              <span className="chip-value">{trainingIp}</span>
            </div>
          </>
        )}
      </div>

      {modal === "level" && (
        <ValueInputModal
          type="number"
          title="Edit Level"
          initial={level}
          min={1}
          onConfirm={(v) => {
            updateNested(["creation", "level"], v);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "ip" && (
        <ValueInputModal
          type="number"
          title="Edit I.P."
          initial={ip}
          min={0}
          onConfirm={(v) => {
            updateNested(["improvementPoints", "ip"], v);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "trainingIp" && (
        <ValueInputModal
          type="number"
          title="Edit Training I.P."
          initial={trainingIp}
          min={0}
          onConfirm={(v) => {
            updateNested(["improvementPoints", "trainingIp"], v);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "nickname" && (
        <ValueInputModal
          type="text"
          title="Edit Nickname"
          initial={character.nickname ?? ""}
          onConfirm={(v) => {
            update({ nickname: v.toLowerCase().replace(/\s/g, "") });
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
