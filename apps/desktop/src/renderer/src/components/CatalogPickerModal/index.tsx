import { useState, useMemo } from "react";
import type { CatalogItem, CatalogMagic } from "@wilmak/game-data";
import { searchCatalog } from "@wilmak/game-data";
import Modal from "../Modal";
import "./CatalogPickerModal.css";

interface Props {
  title: string;
  items: CatalogItem[];
  onSelect: (item: CatalogItem) => void;
  onCustom?: () => void;
  onClose: () => void;
  customLabel?: string;
  emptyMessage?: string;
}

export default function CatalogPickerModal({
  title,
  items,
  onSelect,
  onCustom,
  onClose,
  customLabel = "Add custom (blank)",
  emptyMessage = "No items match your search.",
}: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => searchCatalog(items, query), [items, query]);

  return (
    <Modal
      title={title}
      size="md"
      onClose={onClose}
      backdropClassName="catalog-modal-backdrop"
      subheader={
        <div className="catalog-search-wrap">
          <input
            className="catalog-search"
            type="search"
            placeholder="Search by name, type, effect..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      }
      footer={
        onCustom ? (
          <button type="button" className="catalog-custom-btn" onClick={onCustom}>
            {customLabel}
          </button>
        ) : undefined
      }
    >
      <div className="catalog-list">
        {filtered.length === 0 ? (
          <p className="catalog-empty">{emptyMessage}</p>
        ) : (
          filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              className="catalog-item"
              onClick={() => onSelect(item)}
            >
              <span className="catalog-item-name">{item.name}</span>
              <span className="catalog-item-meta">{itemSubtitle(item)}</span>
              {(item as CatalogMagic).defense && (
                <span className="catalog-item-meta">
                  Defense: {(item as CatalogMagic).defense}
                </span>
              )}
              {(item as CatalogMagic).components && (
                <span className="catalog-item-meta">
                  Components: {(item as CatalogMagic).components}
                </span>
              )}
              {(item as CatalogMagic).requirement && (
                <span className="catalog-item-meta">
                  Lift: {(item as CatalogMagic).requirement}
                </span>
              )}
              {(item as CatalogMagic).effect && (
                <span className="catalog-item-effect">
                  {(item as CatalogMagic).effect}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}

function itemSubtitle(item: CatalogItem): string {
  const w = item as unknown as Record<string, unknown>;
  if (w["dmg"]) return [w["type"], w["dmg"], w["hand"]].filter(Boolean).join(" · ");
  if (w["sp"] != null) return `SP ${w["sp"]}${w["slot"] ? ` · ${w["slot"]}` : ""}`;
  if (w["category"]) {
    const sta = w["staCostText"] || (w["staCost"] ? `STA ${w["staCost"]}` : "");
    return [sta, w["defense"], w["range"], w["tier"], w["element"]]
      .filter(Boolean)
      .join(" · ");
  }
  return "";
}
