import type { Character, CombatState, Spell } from "@wilmak/shared";
import { formatDamageBreakdown } from "@wilmak/game-data";
import { GiD10 } from "react-icons/gi";
import Modal from "../Modal";
import CombatantStrip from "../AttackModal/CombatantStrip";
import { useSpellAttackForm } from "./useSpellAttackForm";
import type { AttackSubmitPayload } from "../AttackModal/types";
import "../AttackModal/AttackModal.css";
import "../StartCombatModal/StartCombatModal.css";
import "./SpellAttackModal.css";

function defenseLabel(type: "dodge" | "reposition" | "none"): string {
  if (type === "none") return "None (DC)";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function isVariableSta(spell: Spell): boolean {
  return spell.staCostText?.toLowerCase().includes("variable") === true || spell.staCost <= 0;
}

interface Props {
  combat: CombatState;
  attacker: Character;
  characters: Character[];
  onSubmit: (payload: AttackSubmitPayload) => void | Promise<void>;
  onClose: () => void;
}

export default function SpellAttackModal({
  combat,
  attacker,
  characters,
  onSubmit,
  onClose,
}: Props) {
  const form = useSpellAttackForm({ combat, attacker, characters, onSubmit });
  const {
    step, setStep,
    targets, target, targetId, setTargetId,
    spell, attackerSpells, spellId, handleSpellChange,
    defenseType, setDefenseType,
    defenseDc, setDefenseDc,
    customModifier, setCustomModifier,
    staSpent, setStaSpent,
    dmgExpression, setDmgExpression,
    attackerRollInput, setAttackerRollInput,
    defenderRollInput, setDefenderRollInput,
    fumbleRollInput, setFumbleRollInput,
    focusExplosionRollInput, setFocusExplosionRollInput,
    showAllDice, setShowAllDice,
    damageDieRollInput, setDamageDieRollInput,
    preview, applyDamage, setApplyDamage,
    error, submitting,
    isPlayerAttacker, isPlayerDefender,
    castingBase, armorEvMod, totalModifier,
    effectiveSta, vigorThreshold, overexertionPreview,
    defBaseValue, targetArmorSp,
    isFumble, isCatastrophicFumble,
    handlePreview, handleConfirm,
  } = form;

  const footer = (
    <>
      <button type="button" onClick={onClose} disabled={submitting}>Cancel</button>
      {step === "result" && (
        <button type="button" className="btn-sm" onClick={() => setStep("cast")} disabled={submitting}>
          ← Back
        </button>
      )}
      {step === "cast" && (
        <button type="button" className="btn-sm" onClick={handlePreview} disabled={submitting}>
          Preview
        </button>
      )}
      <button
        type="button"
        className="primary"
        onClick={() => void handleConfirm()}
        disabled={submitting || (step === "result" && !preview)}
      >
        {submitting
          ? "Recording…"
          : step === "result"
            ? preview?.hit && applyDamage ? "Apply & confirm" : "Log only"
            : preview ? "Confirm cast" : "Resolve & confirm"}
      </button>
    </>
  );

  return (
    <Modal
      title={`Spell Attack — Round ${combat.round}`}
      size="xl"
      onClose={onClose}
      footer={footer}
    >
      {/* Combatant comparison strip */}
      <CombatantStrip
        attacker={attacker}
        targets={targets}
        target={target}
        targetId={targetId}
        onTargetChange={setTargetId}
        effectiveAtkBase={castingBase + totalModifier}
        attackModifier={totalModifier}
        defBaseValue={defBaseValue}
        margin={
          castingBase + totalModifier !== null && defBaseValue !== null
            ? castingBase + totalModifier - defBaseValue
            : null
        }
        resolvedDefenseType={defenseType}
        isThrown={false}
        targetArmorSp={targetArmorSp}
      />

      {/* Step 1: Cast setup */}
      {step === "cast" && (
        <div className="attack-modal-form">
          <div className="attack-modal-grid">
            {/* Spell selector */}
            <div className="field">
              <label>Spell</label>
              <select value={spellId} onChange={(e) => handleSpellChange(e.target.value)}>
                {attackerSpells.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.category} · STA {s.staCost || "var"}
                  </option>
                ))}
              </select>
            </div>

            {/* STA spent (only for variable-cost spells) */}
            {spell && isVariableSta(spell) && (
              <div className="field">
                <label>STA spent</label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={staSpent}
                  onChange={(e) => setStaSpent(e.target.value)}
                />
              </div>
            )}

            {/* Defense type */}
            <div className="field">
              <label>Defense</label>
              <select
                value={defenseType}
                onChange={(e) => setDefenseType(e.target.value as "dodge" | "reposition" | "none")}
              >
                {(["dodge", "reposition", "none"] as const).map((d) => (
                  <option key={d} value={d}>{defenseLabel(d)}</option>
                ))}
              </select>
            </div>

            {/* Defense DC (when none) */}
            {defenseType === "none" && (
              <div className="field">
                <label>Defense DC</label>
                <input
                  type="number"
                  min={0}
                  value={defenseDc}
                  onChange={(e) => setDefenseDc(e.target.value)}
                />
                <span className="attack-dc-hint">Caster must meet or beat this</span>
              </div>
            )}

            {/* Custom modifier */}
            <div className="field">
              <label>Custom modifier</label>
              <input
                type="number"
                value={customModifier}
                onChange={(e) => setCustomModifier(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Spell info card */}
          {spell && (
            <div className="spell-attack-info panel">
              <div className="spell-attack-info-row">
                <span className="spell-attack-info-name">{spell.name}</span>
                <span className="spell-attack-info-cat">{spell.category}</span>
                {spell.element && (
                  <span className={`magic-cast-element magic-cast-element--${spell.element}`}>
                    {spell.element}
                  </span>
                )}
              </div>
              <div className="spell-attack-info-costs">
                <span>STA: <strong>{effectiveSta}</strong></span>
                <span>Vigor threshold: <strong>{vigorThreshold}</strong></span>
                {overexertionPreview > 0 && (
                  <span className="spell-attack-overexert">
                    Overexertion: <strong>−{overexertionPreview} HP</strong>
                  </span>
                )}
                {armorEvMod !== 0 && (
                  <span>Armor EV: <strong>{armorEvMod}</strong></span>
                )}
              </div>
              <p className="spell-attack-effect">{spell.effect}</p>
              {spell.range && <p className="spell-attack-meta">Range: {spell.range}</p>}
            </div>
          )}

          {/* Damage expression */}
          <div className="field">
            <label>Spell damage dice (optional)</label>
            <input
              value={dmgExpression}
              onChange={(e) => setDmgExpression(e.target.value)}
              placeholder="e.g. 3d6 or 2d6+4 — leave empty for non-damaging spells"
            />
          </div>

          {/* Dice rolls */}
          <div className="attack-rolls">
            <div className="attack-rolls-header">
              <span className="attack-rolls-label">Dice rolls</span>
              <button
                type="button"
                className={`dice-toggle-btn${showAllDice ? " dice-toggle-btn--active" : ""}`}
                onClick={() => setShowAllDice(!showAllDice)}
                title={showAllDice ? "Hide damage dice inputs" : "Enter damage dice manually"}
              >
                <GiD10 />
                {showAllDice ? "Hide damage dice" : "Enter damage dice"}
              </button>
            </div>

            <div className="field">
              <label>Caster d10{isPlayerAttacker ? "" : " (auto if empty)"}</label>
              <input
                value={attackerRollInput}
                onChange={(e) => setAttackerRollInput(e.target.value)}
                placeholder={isPlayerAttacker ? "e.g. 7 or 10,7" : "Leave empty to simulate"}
              />
            </div>

            {/* Fumble second roll — appears when first roll is 1 */}
            {isFumble && (
              <div className="field">
                <label>Magic fumble — second d10</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={fumbleRollInput}
                  onChange={(e) => setFumbleRollInput(e.target.value)}
                  placeholder="Required on natural 1"
                />
              </div>
            )}

            {/* Focus explosion roll — appears when fumble second roll is 10 */}
            {isCatastrophicFumble && (
              <div className="field">
                <label>Focus explosion — d10 damage</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={focusExplosionRollInput}
                  onChange={(e) => setFocusExplosionRollInput(e.target.value)}
                  placeholder="Catastrophic fumble"
                />
              </div>
            )}

            {defenseType !== "none" && (
              <div className="field">
                <label>Defender d10{isPlayerDefender ? "" : " (auto if empty)"}</label>
                <input
                  value={defenderRollInput}
                  onChange={(e) => setDefenderRollInput(e.target.value)}
                  placeholder={isPlayerDefender ? "e.g. 6" : "Leave empty to simulate"}
                />
              </div>
            )}

            {showAllDice && dmgExpression.trim() && (
              <div className="field">
                <label>
                  Spell damage dice — {dmgExpression}
                  <span className="dice-optional-tag"> optional</span>
                </label>
                <input
                  value={damageDieRollInput}
                  onChange={(e) => setDamageDieRollInput(e.target.value)}
                  placeholder="e.g. 4,2 — leave empty to auto-roll"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Result preview */}
      {step === "result" && preview && (
        <div className="attack-modal-form">
          <label className="field-toggle">
            <span className="field-toggle-label">Apply damage to character sheet</span>
            <input
              type="checkbox"
              checked={applyDamage}
              onChange={(e) => setApplyDamage(e.target.checked)}
            />
          </label>

          <div className="damage-preview-list">
            <div className={`damage-result${preview.hit ? " damage-result--hit" : " damage-result--miss"}`}>
              {/* Header */}
              <div className="damage-result-head">
                <span className={`damage-outcome damage-outcome--${preview.hit ? "hit" : "miss"}`}>
                  {preview.hit ? "HIT" : "MISS"}
                </span>
                <span className="spell-attack-result-spell">{preview.weapon.name}</span>
                {preview.hit && preview.hitLocation && (
                  <span className="damage-location">
                    {preview.hitLocation} ×{preview.locationMultiplier}
                  </span>
                )}
              </div>

              {/* Roll comparison */}
              <div className="damage-rolls">
                <span className="damage-roll-num">{preview.attackRoll.total}</span>
                <span className="damage-roll-label">cast</span>
                {(preview.defenseRoll || preview.defenseDc !== undefined) && (
                  <>
                    <span className="damage-roll-sep">vs</span>
                    <span className="damage-roll-num">
                      {preview.defenseRoll ? preview.defenseRoll.total : `DC ${preview.defenseDc}`}
                    </span>
                    {preview.defenseRoll && <span className="damage-roll-label">def</span>}
                  </>
                )}
                {preview.hit && preview.defenseRoll && (
                  <span className="damage-margin">
                    +{preview.attackRoll.total - preview.defenseRoll.total}
                  </span>
                )}
              </div>

              {/* Damage breakdown */}
              {preview.hit && preview.finalDamage !== undefined && (
                <ol className="damage-breakdown">
                  {formatDamageBreakdown(preview).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ol>
              )}

              {/* HP before/after for target */}
              {preview.hit && target && applyDamage && preview.finalDamage !== undefined && (
                <div className="damage-hp-delta">
                  <div className="damage-hp-track-wrap">
                    <div className="damage-hp-track">
                      <div
                        className="damage-hp-fill damage-hp-fill--ok"
                        style={{ width: `${Math.max(0, Math.min(100, (target.vitals.hp.current / target.vitals.hp.max) * 100))}%` }}
                      />
                    </div>
                    <span className="damage-hp-val">{target.vitals.hp.current} HP</span>
                  </div>
                  <span className="damage-hp-arrow">→</span>
                  <div className="damage-hp-track-wrap">
                    <div className="damage-hp-track">
                      <div
                        className="damage-hp-fill damage-hp-fill--low"
                        style={{ width: `${Math.max(0, Math.min(100, (Math.max(0, target.vitals.hp.current - preview.finalDamage) / target.vitals.hp.max) * 100))}%` }}
                      />
                    </div>
                    <span className="damage-hp-val">
                      {Math.max(0, target.vitals.hp.current - preview.finalDamage)} HP
                    </span>
                  </div>
                  <span className="damage-hp-taken">−{preview.finalDamage}</span>
                </div>
              )}

              {/* Caster costs */}
              <div className="spell-attack-caster-costs">
                <span>STA: {attacker.vitals.sta.current} → {Math.max(0, attacker.vitals.sta.current - (preview.staCost ?? 0))}</span>
                {(preview.overexertionHp ?? 0) > 0 && (
                  <span className="spell-attack-overexert">
                    Overexertion: −{preview.overexertionHp} HP ({attacker.vitals.hp.current} → {Math.max(0, attacker.vitals.hp.current - (preview.overexertionHp ?? 0))})
                  </span>
                )}
              </div>

              {/* Magic fumble info */}
              {preview.magicFumble && (
                <div className="spell-attack-fumble">
                  <span className="spell-attack-fumble-title">
                    Fumble ({preview.magicFumble.tier}, {preview.magicFumble.element})
                  </span>
                  {preview.magicFumble.selfDamage > 0 && (
                    <span>Self-damage: −{preview.magicFumble.selfDamage} HP</span>
                  )}
                  {preview.magicFumble.stunned && <span>Stunned</span>}
                  {preview.magicFumble.onFire && <span>On fire</span>}
                  {preview.magicFumble.frozen && <span>Frozen</span>}
                  {preview.magicFumble.knockedBackMeters > 0 && (
                    <span>Knocked back {preview.magicFumble.knockedBackMeters}m</span>
                  )}
                  {preview.magicFumble.focusExplodes && (
                    <span>Focus explodes ({preview.magicFumble.focusExplosionDamage ?? "?"} dmg)</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <p className="modal-error">{error}</p>}
    </Modal>
  );
}
