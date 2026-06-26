import { useEffect, type ReactNode } from "react";
import "./Modal.css";

export interface ModalProps {
  title: string;
  size?: "sm" | "md" | "lg" | "xl";
  onClose: () => void;
  /** Non-scrolling content between header and body (tabs, steps, search…) */
  subheader?: ReactNode;
  /** Sticky action row at the bottom — right-aligned */
  footer?: ReactNode;
  children: ReactNode;
  /** Extra class(es) on the modal container */
  className?: string;
  /** Extra class(es) on the backdrop (e.g. to raise z-index for nested modals) */
  backdropClassName?: string;
}

export default function Modal({
  title,
  size = "md",
  onClose,
  subheader,
  footer,
  children,
  className,
  backdropClassName,
}: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const backdropCls = ["modal-backdrop", backdropClassName].filter(Boolean).join(" ");
  const modalCls = ["modal", `modal--${size}`, className].filter(Boolean).join(" ");

  return (
    <div className={backdropCls} onClick={onClose} role="presentation">
      <div
        className={modalCls}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {subheader && <div className="modal-subheader">{subheader}</div>}

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
