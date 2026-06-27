import { useEffect } from "react";
import type { Spell } from "@wilmak/shared";
import { getSpellDetail } from "@wilmak/game-data";
import "./SpellDetailModal.css";

interface Props {
  spell: Spell;
  onClose: () => void;
}

function elementBadgeClass(element?: string): string {
  if (!element) return "";
  return `spell-detail-badge--element-${element}`;
}

export default function SpellDetailModal({ spell, onClose }: Props) {
  const detail = getSpellDetail(spell);

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

  return (
    <div
      className="spell-detail-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="spell-detail-modal-panel panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="spell-detail-title"
      >
        <div className="spell-detail-modal-header">
          <h2 id="spell-detail-title" className="spell-detail-modal-title">
            {detail.name}
          </h2>
          <button
            type="button"
            className="spell-detail-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="spell-detail-modal-body">
          <div className="spell-detail-badges">
            <span className="spell-detail-badge spell-detail-badge--category">
              {detail.categoryLabel}
            </span>
            {detail.elementLabel && (
              <span className={`spell-detail-badge ${elementBadgeClass(detail.element)}`}>
                {detail.elementLabel}
              </span>
            )}
            {detail.tier && <span className="spell-detail-badge">{detail.tier}</span>}
            {detail.isHomebrew && (
              <span className="spell-detail-badge spell-detail-badge--homebrew">Homebrew</span>
            )}
          </div>

          <div className="spell-detail-stats">
            {detail.stats.map((stat) => (
              <div key={stat.label} className="spell-detail-stat">
                <span className="spell-detail-stat-label">{stat.label}</span>
                <span className="spell-detail-stat-value">{stat.value}</span>
              </div>
            ))}
          </div>

          <h3 className="spell-detail-section-title">Effect</h3>
          <p className="spell-detail-effect">{detail.effect}</p>

          {detail.extras.length > 0 && (
            <div className="spell-detail-extras">
              {detail.extras.map((extra) => (
                <div key={extra.label} className="spell-detail-extra">
                  <span className="spell-detail-extra-label">{extra.label}</span>
                  <p className="spell-detail-extra-value">{extra.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SpellNameButton({
  spell,
  onOpen,
}: {
  spell: Spell;
  onOpen: (spell: Spell) => void;
}) {
  return (
    <button type="button" className="spell-name-link" onClick={() => onOpen(spell)}>
      {spell.name || "—"}
    </button>
  );
}
