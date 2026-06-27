import type { Spell } from "@wilmak/shared";
import { getSpellDetail } from "@wilmak/game-data";
import Modal from "../Modal";
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

  return (
    <Modal title={detail.name} size="lg" onClose={onClose} className="spell-detail-modal">
      <div className="spell-detail-badges">
        <span className="spell-detail-badge spell-detail-badge--category">
          {detail.categoryLabel}
        </span>
        {detail.elementLabel && (
          <span className={`spell-detail-badge ${elementBadgeClass(detail.element)}`}>
            {detail.elementLabel}
          </span>
        )}
        {detail.tier && (
          <span className="spell-detail-badge">{detail.tier}</span>
        )}
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
    </Modal>
  );
}
