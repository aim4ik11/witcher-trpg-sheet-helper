import type { Character } from "@wilmak/shared";
import { DynamicTable } from "./helpers";
import type { DynRow } from "./helpers";

interface Props {
  character: Character;
  update: (patch: Partial<Character>) => void;
  readOnly: boolean;
}

export default function InventoryTab({ character, update, readOnly }: Props) {
  return (
    <section className="panel">
      <div className="panel-title">Ammo, Bombs, Potions, Traps</div>
      <DynamicTable
        readOnly={readOnly}
        columns={[
          { key: "qty", label: "#", type: "number" },
          { key: "name", label: "Name" },
          { key: "effect", label: "Effect" },
          { key: "weight", label: "Wt", type: "number" },
        ]}
        rows={(character.consumables ?? []) as unknown as DynRow[]}
        onChange={(rows) =>
          update({ consumables: rows as unknown as Character["consumables"] })
        }
        onAdd={(empty) =>
          update({
            consumables: [
              ...(character.consumables ?? []),
              { ...empty, id: crypto.randomUUID() } as NonNullable<
                Character["consumables"]
              >[number],
            ],
          })
        }
        onRemove={(i) =>
          update({
            consumables: character.consumables!.filter((_, idx) => idx !== i),
          })
        }
        emptyRow={{ qty: 0, name: "", effect: "", weight: 0 }}
      />
    </section>
  );
}
