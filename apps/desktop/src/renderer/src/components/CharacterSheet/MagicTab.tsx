import { useState } from "react";
import type { Character, Spell } from "@wilmak/shared";
import { spellsForCategory, MAGIC_ROW_EMPTY } from "@wilmak/game-data";
import SpellDetailModal from "../SpellDetailModal";
import "../SpellDetailModal/SpellDetailModal.css";
import { DynamicTable } from "./helpers";
import type { DynRow } from "./helpers";

interface MagicSection {
  key: string;
  label: string;
}

interface PickerState {
  kind: "weapon" | "armor" | "magic";
  slotIndex?: number;
  slot?: string;
  category?: string;
  label?: string;
}

interface Props {
  character: Character;
  updateSpellsForCategory: (category: string, rows: Spell[]) => void;
  readOnly: boolean;
  magicSections: MagicSection[];
  magicCastable: boolean;
  setPicker: (s: PickerState | null) => void;
  onMagicCast?: (params: { spell: Spell }) => void;
}

export default function MagicTab({
  character,
  updateSpellsForCategory,
  readOnly,
  magicSections,
  magicCastable,
  setPicker,
  onMagicCast,
}: Props) {
  const [detailSpell, setDetailSpell] = useState<Spell | null>(null);

  return (
    <>
      {magicSections.map((section) => (
        <section key={section.key} className="panel magic-section">
          <div className="panel-title">{section.label}</div>
          <p className="spell-table-hint">Click a spell name for full details.</p>
          <DynamicTable
            readOnly={readOnly}
            columns={[
              { key: "name", label: "Name" },
              { key: "staCostText", label: "STA" },
              { key: "defense", label: "Defense" },
              { key: "range", label: "Range" },
              { key: "duration", label: "Duration" },
              { key: "effect", label: "Effect" },
            ]}
            rows={spellsForCategory(character.spells, section.key) as unknown as DynRow[]}
            onChange={(rows) =>
              updateSpellsForCategory(section.key, rows as unknown as Spell[])
            }
            onAdd={() => {}}
            onRemove={(i) => {
              const rows = spellsForCategory(character.spells, section.key);
              updateSpellsForCategory(
                section.key,
                rows.filter((_, idx) => idx !== i),
              );
            }}
            emptyRow={{ ...MAGIC_ROW_EMPTY }}
            renderCell={(row, col) => {
              if (col.key !== "name") return null;
              const name = String(row.name || "—");
              return (
                <button
                  type="button"
                  className="spell-name-link"
                  onClick={() => setDetailSpell(row as unknown as Spell)}
                >
                  {name}
                </button>
              );
            }}
            renderRowActions={
              magicCastable
                ? (row) => (
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => onMagicCast?.({ spell: row as unknown as Spell })}
                    >
                      Cast
                    </button>
                  )
                : undefined
            }
            rowActionsHeader="Cast"
            renderAddActions={() => (
              <button
                type="button"
                className="primary"
                onClick={() =>
                  setPicker({
                    kind: "magic",
                    category: section.key,
                    label: section.label,
                  })
                }
              >
                + Add from catalog
              </button>
            )}
          />
        </section>
      ))}

      {detailSpell && (
        <SpellDetailModal spell={detailSpell} onClose={() => setDetailSpell(null)} />
      )}
    </>
  );
}
