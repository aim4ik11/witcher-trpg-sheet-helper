import { useState, useEffect, useMemo } from 'react';
import type { CatalogItem } from '@wilmak/game-data';
import { searchCatalog } from '@wilmak/game-data';
import './CatalogPickerModal.css';

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
  title, items, onSelect, onCustom, onClose,
  customLabel = 'Add custom (blank)',
  emptyMessage = 'No items match your search.',
}: Props) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => searchCatalog(items, query), [items, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="catalog-modal-backdrop" onClick={onClose} role="presentation">
      <div className="catalog-modal panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="catalog-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="catalog-modal-title">{title}</h2>
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
              <button key={item.id} type="button" className="catalog-item" onClick={() => onSelect(item)}>
                <span className="catalog-item-name">{item.name}</span>
                <span className="catalog-item-meta">{itemSubtitle(item)}</span>
                {(item as { effect?: string }).effect && (
                  <span className="catalog-item-effect">{(item as { effect?: string }).effect}</span>
                )}
              </button>
            ))
          )}
        </div>
        {onCustom && (
          <div className="catalog-footer">
            <button type="button" className="catalog-custom-btn" onClick={onCustom}>{customLabel}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function itemSubtitle(item: CatalogItem): string {
  const w = item as unknown as Record<string, unknown>;
  if (w['dmg']) return [w['type'], w['dmg'], w['hand']].filter(Boolean).join(' · ');
  if (w['sp'] != null) return `SP ${w['sp']}${w['slot'] ? ` · ${w['slot']}` : ''}`;
  if (w['staCost'] != null) return [`STA ${w['staCost']}`, w['range'], w['duration']].filter(Boolean).join(' · ');
  return (w['category'] as string) ?? '';
}
