import { useState } from "react";
import Modal from "../Modal";
import "./ValueInputModal.css";

type NumberProps = {
  type: "number";
  title: string;
  initial: number;
  min?: number;
  max?: number;
  onConfirm: (v: number) => void;
  onClose: () => void;
  validate?: (v: number) => string | null;
  hardBlock?: boolean;
};

type TextProps = {
  type?: "text";
  title: string;
  initial: string;
  onConfirm: (v: string) => void;
  onClose: () => void;
  validate?: (v: string) => string | null;
  hardBlock?: boolean;
};

type Props = NumberProps | TextProps;

export default function ValueInputModal(props: Props) {
  const { title, onClose, hardBlock } = props;
  const isNumber = props.type === "number";

  const [raw, setRaw] = useState(String(props.initial));

  const numValue = isNumber ? (raw.trim() === "" ? NaN : Number(raw)) : NaN;
  const isValidInput = !isNumber || !isNaN(numValue);

  const error = (() => {
    if (!isValidInput || !props.validate) return null;
    if (isNumber) return (props as NumberProps).validate!(numValue) ?? null;
    return (props as TextProps).validate!(raw) ?? null;
  })();

  const blocked = !isValidInput || (!!hardBlock && !!error);

  function handleConfirm() {
    if (blocked) return;
    if (isNumber) (props as NumberProps).onConfirm(numValue);
    else (props as TextProps).onConfirm(raw);
  }

  return (
    <Modal
      title={title}
      size="sm"
      onClose={onClose}
      backdropClassName="modal-backdrop--raised"
      footer={
        <>
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            onClick={handleConfirm}
            disabled={blocked}
          >
            Apply
          </button>
        </>
      }
    >
      <div className="value-input-body">
        <input
          type={isNumber ? "number" : "text"}
          value={raw}
          min={isNumber ? (props as NumberProps).min : undefined}
          max={isNumber ? (props as NumberProps).max : undefined}
          autoFocus
          onFocus={(e) => e.target.select()}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !blocked) handleConfirm(); }}
        />
        {error && <p className="value-input-error">{error}</p>}
      </div>
    </Modal>
  );
}
