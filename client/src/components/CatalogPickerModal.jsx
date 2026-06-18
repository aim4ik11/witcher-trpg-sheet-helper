import { useState, useEffect, useMemo } from 'react';
import { searchCatalog } from '../catalog';
import './CatalogPickerModal.css';

export default function CatalogPickerModal({
  title,
  items,
  onSelect,
  onCustom,
  onClose,
  customLabel = 'Add custom (blank)',
  emptyMessage = 'No items match your search.',
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => searchCatalog(items, query), [items, query]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="catalog-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="catalog-modal panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-modal-title"
      >
        <button type="button" className="catalog-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 id="catalog-modal-title" className="catalog-modal-title">{title}</h2>

        <input
          className="catalog-search"
          type="search"
          placeholder="Search by name, type, effect..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

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
                <span className="catalog-item-meta">
                  {itemSubtitle(item)}
                </span>
                {item.effect && (
                  <span className="catalog-item-effect">{item.effect}</span>
                )}
              </button>
            ))
          )}
        </div>

        {onCustom && (
          <div className="catalog-footer">
            <button type="button" className="catalog-custom-btn" onClick={onCustom}>
              {customLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function itemSubtitle(item) {
  if (item.dmg) {
    return [item.type, item.dmg, item.hand].filter(Boolean).join(' · ');
  }
  if (item.sp != null) {
    return `SP ${item.sp}${item.slot ? ` · ${item.slot}` : ''}`;
  }
  if (item.staCost != null) {
    return [`STA ${item.staCost}`, item.range, item.duration].filter(Boolean).join(' · ');
  }
  return item.category ?? '';
}
