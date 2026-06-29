import type { Character, InventoryItem } from "@wilmak/shared";
import { DynamicTable } from "./helpers";
import type { DynRow } from "./helpers";

interface PickerState {
  kind: "weapon" | "armor" | "magic" | "item";
}

interface Props {
  character: Character;
  update: (patch: Partial<Character>) => void;
  readOnly: boolean;
  setPicker: (s: PickerState | null) => void;
}

const EMPTY_ITEM: Partial<InventoryItem> = {
  qty: 1,
  name: "",
  category: "custom",
  effect: "",
  weight: 0,
  cost: 0,
};

export default function InventoryTab({ character, update, readOnly, setPicker }: Props) {
  const inventory = character.inventory ?? [];
  const totalWeight = inventory.reduce(
    (sum, item) => sum + (item.qty ?? 0) * (item.weight ?? 0),
    0,
  );

  return (
    <section className="panel">
      <div className="panel-title">Inventory</div>
      <p className="sheet-muted">
        Total carried item weight: {Number(totalWeight.toFixed(2))} kg
      </p>
      <DynamicTable
        readOnly={readOnly}
        columns={[
          { key: "qty", label: "#", type: "number" },
          { key: "name", label: "Name" },
          { key: "category", label: "Category" },
          { key: "effect", label: "Effect" },
          { key: "weight", label: "Wt", type: "number" },
          { key: "cost", label: "Cost", type: "number" },
        ]}
        rows={inventory as unknown as DynRow[]}
        onChange={(rows) => update({ inventory: rows as unknown as InventoryItem[] })}
        onAdd={(empty) =>
          update({
            inventory: [
              ...inventory,
              { ...empty, id: crypto.randomUUID() } as InventoryItem,
            ],
          })
        }
        onRemove={(i) =>
          update({
            inventory: inventory.filter((_, idx) => idx !== i),
          })
        }
        emptyRow={EMPTY_ITEM as DynRow}
        renderAddActions={() => (
          <>
            <button
              type="button"
              className="primary"
              onClick={() => setPicker({ kind: "item" })}
            >
              + Add from catalog
            </button>
            <button
              type="button"
              onClick={() => {
                update({
                  inventory: [
                    ...inventory,
                    { ...EMPTY_ITEM, id: crypto.randomUUID() } as InventoryItem,
                  ],
                });
              }}
            >
              + Custom item
            </button>
          </>
        )}
      />
    </section>
  );
}
