import { useState, useCallback, type PropsWithChildren } from "react";
import { MdOutlineSave } from "react-icons/md";
import "./GeneralLayout.css";

type SaveState = "idle" | "saving" | "saved" | "error";

function ForceSaveButton() {
  const [state, setState] = useState<SaveState>("idle");

  const handleSave = useCallback(async () => {
    if (state === "saving") return;
    setState("saving");
    try {
      await window.api.forceSave();
      setState("saved");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }, [state]);

  const label =
    state === "saving" ? "Saving…"
    : state === "saved" ? "Saved"
    : state === "error" ? "Error"
    : "Save";

  return (
    <button
      type="button"
      className={`force-save-btn force-save-btn--${state}`}
      onClick={() => void handleSave()}
      disabled={state === "saving"}
      title="Force save all character data to disk"
    >
      <MdOutlineSave className="force-save-btn__icon" />
      <span className="force-save-btn__label">{label}</span>
    </button>
  );
}

const GeneralLayout = ({ children }: PropsWithChildren) => {
  return (
    <>
      {children}
      <div className="force-save-portal">
        <ForceSaveButton />
      </div>
    </>
  );
};

export default GeneralLayout;
