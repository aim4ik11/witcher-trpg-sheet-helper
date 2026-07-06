import type { Character, CombatAttackType, CombatDefenseType, Weapon } from "@wilmak/shared";
import { attackTypeConfig, weaponRateOfFire, type RangeBand } from "@wilmak/game-data";
import type { AttackFormState } from "./useAttackForm";
import AttackModifiers from "./AttackModifiers";
import DiceRollInputs from "./DiceRollInputs";

const RANGE_BANDS: { id: RangeBand; label: string }[] = [
  { id: "pointBlank", label: "Point blank (+5)" },
  { id: "close", label: "Close (+0)" },
  { id: "medium", label: "Medium (−2)" },
  { id: "long", label: "Long (−4)" },
  { id: "extreme", label: "Extreme (−6)" },
];

function defenseLabel(type: CombatDefenseType): string {
  if (type === "none") return "None (DC)";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function weaponOptionLabel(weapon: Weapon, attacker?: Character): string {
  const rof = weaponRateOfFire(weapon, attacker);
  const parts = [`ROF ${rof}`, weapon.dmg];
  if (weapon.wa) parts.push(`WA ${weapon.wa >= 0 ? `+${weapon.wa}` : weapon.wa}`);
  if (weapon.effect && weapon.effect !== "N/A") parts.push(weapon.effect);
  return `${weapon.name} — ${parts.join(" · ")}`;
}

function formatRofSummary(rof: number): string {
  if (rof <= 1) return "ROF 1 — one attack roll per action";
  return `ROF ${rof} — ${rof} separate attack rolls per action`;
}

interface Props {
  form: AttackFormState;
  attacker: Character;
}

export default function AttackSetupForm({ form, attacker }: Props) {
  const {
    weaponChoice, setWeaponChoice,
    attackerWeapons, showUnarmed,
    isEnemyAttacker,
    attackOptions, resolvedAttackType, setAttackType,
    selectedWeapon, selectedRof, typeConfig,
    allowedDefenses, resolvedDefenseType, setDefenseType,
    rangeBand, setRangeBand,
    defenseDc, setDefenseDc,
    defenderBlockSkill, target,
    attackBasePreview,
    aimLocation, setAimLocation,
    customModifier, setCustomModifier,
    targetDodging, setTargetDodging,
    fastDraw, setFastDraw,
    ambush, setAmbush,
    outsideVisionCone, setOutsideVisionCone,
    attackerRollInput, setAttackerRollInput,
    defenderRollInputs, setDefenderRollInputs,
    isPlayerAttacker, isPlayerDefender,
    fastStrikeCount,
  } = form;

  return (
    <div className="attack-modal-form">
      <div className="attack-modal-grid">
        {/* Weapon */}
        <div className="field">
          <label>{isEnemyAttacker ? "Attack" : "Weapon"}</label>
          <select
            value={
              weaponChoice.kind === "weapon"
                ? `w:${weaponChoice.weaponId}`
                : `u:${weaponChoice.unarmed}`
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v.startsWith("u:")) {
                setWeaponChoice({ kind: "unarmed", unarmed: v.slice(2) as "punch" | "kick" });
              } else {
                setWeaponChoice({ kind: "weapon", weaponId: v.slice(2) });
              }
            }}
          >
            {attackerWeapons.map((w) => (
              <option key={w.id} value={`w:${w.id}`}>
                {weaponOptionLabel(w, attacker)}
              </option>
            ))}
            {showUnarmed && (
              <>
                <option value="u:punch">Punch ({attacker.bonusMelee?.punch ?? "1d6"})</option>
                <option value="u:kick">Kick ({attacker.bonusMelee?.kick ?? "1d6+2"})</option>
              </>
            )}
          </select>
        </div>

        {/* Attack type or ROF summary */}
        {attackOptions.showAttackTypes ? (
          <div className="field">
            <label>Attack type</label>
            <select
              value={resolvedAttackType}
              onChange={(e) => setAttackType(e.target.value as CombatAttackType)}
            >
              {attackOptions.attackTypes.map((t) => {
                const cfg = selectedWeapon ? attackTypeConfig(t, selectedWeapon) : null;
                return (
                  <option key={t} value={t} disabled={cfg ? !cfg.allowed : false}>
                    {cfg?.label ?? t}
                    {cfg && !cfg.allowed ? " (N/A)" : ""}
                  </option>
                );
              })}
            </select>
          </div>
        ) : (
          selectedWeapon && (
            <div className="attack-base-preview attack-rof-summary">
              <span className="attack-rof-badge">ROF {selectedRof}</span>
              <div>
                <strong>{selectedWeapon.name}</strong>
                {selectedWeapon.dmg && (
                  <span className="attack-rof-dmg"> · {selectedWeapon.dmg} damage</span>
                )}
              </div>
              <div className="attack-rof-detail">{formatRofSummary(selectedRof)}</div>
              {selectedWeapon.effect && selectedWeapon.effect !== "N/A" && (
                <div className="attack-rof-effect">{selectedWeapon.effect}</div>
              )}
            </div>
          )
        )}

        {/* Defense type */}
        <div className="field">
          <label>Defense</label>
          <select
            value={resolvedDefenseType}
            onChange={(e) => setDefenseType(e.target.value as CombatDefenseType)}
          >
            {allowedDefenses.map((d) => (
              <option key={d} value={d}>
                {defenseLabel(d)}
                {d === "block" && selectedWeapon?.isRanged && !selectedWeapon.isThrown && " (shield only)"}
                {d === "parry" && selectedWeapon?.isThrown && " (−5 vs thrown)"}
              </option>
            ))}
          </select>
        </div>

        {/* Range band (ranged weapons only) */}
        {selectedWeapon?.isRanged && (
          <div className="field">
            <label>Range</label>
            <select
              value={rangeBand}
              onChange={(e) => setRangeBand(e.target.value as RangeBand)}
            >
              {RANGE_BANDS.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Defense DC or block/parry skill info */}
        {resolvedDefenseType === "none" ? (
          <div className="field">
            <label>Defense DC</label>
            <input
              type="number"
              min={0}
              value={defenseDc}
              onChange={(e) => setDefenseDc(e.target.value)}
            />
            <span className="attack-dc-hint">Attacker must meet or beat this</span>
          </div>
        ) : (
          target && defenderBlockSkill && (
            <div className="attack-def-detail">
              <span className="attack-def-detail-label">Def skill</span>
              <span className="attack-def-detail-name">
                {defenderBlockSkill.charAt(0).toUpperCase() + defenderBlockSkill.slice(1)}
              </span>
              {resolvedDefenseType === "parry" && (
                <span className="attack-def-detail-pen">
                  {selectedWeapon?.isThrown ? "−5 vs thrown" : "−3 parry penalty"}
                </span>
              )}
            </div>
          )
        )}
      </div>

      {/* Attack type modifier note */}
      {attackBasePreview !== null && typeConfig && typeConfig.attackModifier !== 0 && (
        <div className="attack-base-preview">
          Weapon base: <strong>{attackBasePreview}</strong>
          <span>
            {" · "}type modifier: {typeConfig.attackModifier > 0 ? "+" : ""}
            {typeConfig.attackModifier}
          </span>
        </div>
      )}

      <AttackModifiers
        aimLocation={aimLocation}
        onAimLocationChange={setAimLocation}
        customModifier={customModifier}
        onCustomModifierChange={setCustomModifier}
        targetDodging={targetDodging}
        onTargetDodgingChange={setTargetDodging}
        fastDraw={fastDraw}
        onFastDrawChange={setFastDraw}
        ambush={ambush}
        onAmbushChange={setAmbush}
        outsideVisionCone={outsideVisionCone}
        onOutsideVisionConeChange={setOutsideVisionCone}
      />

      <DiceRollInputs
        isPlayerAttacker={isPlayerAttacker}
        isPlayerDefender={isPlayerDefender}
        fastStrikeCount={fastStrikeCount}
        attackerRollInput={attackerRollInput}
        onAttackerRollChange={setAttackerRollInput}
        defenderRollInputs={defenderRollInputs}
        onDefenderRollChange={(i, v) => {
          const next = [...defenderRollInputs];
          next[i] = v;
          setDefenderRollInputs(next);
        }}
        resolvedDefenseType={resolvedDefenseType}
      />
    </div>
  );
}
