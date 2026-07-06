import type { Character, CombatState } from "@wilmak/shared";
import { isMonsterAttacker } from "@wilmak/game-data";
import Modal from "../Modal";
import CombatantStrip from "./CombatantStrip";
import DamagePreview from "./DamagePreview";
import AttackSetupForm from "./AttackSetupForm";
import { useAttackForm } from "./useAttackForm";
import type { AttackSubmitPayload } from "./types";
import "./AttackModal.css";
import "../StartCombatModal/StartCombatModal.css";

export type { AttackSubmitPayload } from "./types";

interface Props {
  combat: CombatState;
  attacker: Character;
  characters: Character[];
  onSubmit: (payload: AttackSubmitPayload) => void | Promise<void>;
  onClose: () => void;
}

export default function AttackModal({ combat, attacker, characters, onSubmit, onClose }: Props) {
  const form = useAttackForm({ combat, attacker, characters, onSubmit });
  const {
    step, setStep,
    preview,
    applyDamage, setApplyDamage,
    error,
    submitting,
    targets,
    target,
    targetId, setTargetId,
    resolvedDefenseType,
    selectedWeapon,
    typeConfig,
    targetArmorSp,
    effectiveAtkBase,
    defBaseValue,
    margin,
    handlePreview,
    handleConfirm,
  } = form;

  const footer = (
    <>
      <button type="button" onClick={onClose} disabled={submitting}>
        Cancel
      </button>
      {step === "damage" && (
        <button type="button" className="btn-sm" onClick={() => setStep("attack")} disabled={submitting}>
          ← Back
        </button>
      )}
      {step === "attack" && (
        <button type="button" className="btn-sm" onClick={handlePreview} disabled={submitting}>
          Preview
        </button>
      )}
      <button
        type="button"
        className="primary"
        onClick={() => void handleConfirm()}
        disabled={submitting || (step === "damage" && !preview)}
      >
        {submitting
          ? "Recording…"
          : step === "damage"
            ? (preview?.some((r) => r.hit) && applyDamage ? "Apply & confirm" : "Log only")
            : preview ? "Confirm attack" : "Resolve & confirm"}
      </button>
    </>
  );

  return (
    <Modal title={`Attack — Round ${combat.round}`} size="xl" onClose={onClose} footer={footer}>
      {isMonsterAttacker(attacker) && step === "attack" && (
        <p className="attack-modal-monster-note">
          Monsters use bestiary weapons only — each weapon&apos;s ROF is how many attacks it
          makes per action. No fast/strong/extra strikes.
        </p>
      )}

      <CombatantStrip
        attacker={attacker}
        targets={targets}
        target={target}
        targetId={targetId}
        onTargetChange={setTargetId}
        effectiveAtkBase={effectiveAtkBase}
        attackModifier={typeConfig?.attackModifier ?? 0}
        defBaseValue={defBaseValue}
        margin={margin}
        resolvedDefenseType={resolvedDefenseType}
        isThrown={selectedWeapon?.isThrown}
        targetArmorSp={targetArmorSp}
      />

      {step === "attack" && <AttackSetupForm form={form} attacker={attacker} />}

      {step === "damage" && preview && (
        <DamagePreview
          preview={preview}
          target={target}
          applyDamage={applyDamage}
          onApplyDamageChange={setApplyDamage}
        />
      )}

      {error && <p className="modal-error">{error}</p>}
    </Modal>
  );
}
