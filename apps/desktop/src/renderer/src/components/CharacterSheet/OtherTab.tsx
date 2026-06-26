import type { Character } from "@wilmak/shared";
import { DynamicTable } from "./helpers";
import type { DynRow } from "./helpers";

interface Props {
  character: Character;
  update: (patch: Partial<Character>) => void;
  readOnly: boolean;
}

export default function OtherTab({ character, update, readOnly }: Props) {
  return (
    <>
      <section className="panel">
        <div className="panel-title">Wounds</div>
        <DynamicTable
          readOnly={readOnly}
          columns={[
            { key: "description", label: "Wound" },
            { key: "severity", label: "S/T" },
            { key: "days", label: "Days", type: "number" },
          ]}
          rows={(character.wounds ?? []) as unknown as DynRow[]}
          onChange={(rows) =>
            update({ wounds: rows as unknown as Character["wounds"] })
          }
          onAdd={(empty) =>
            update({
              wounds: [
                ...(character.wounds ?? []),
                { ...empty, id: crypto.randomUUID() } as NonNullable<
                  Character["wounds"]
                >[number],
              ],
            })
          }
          onRemove={(i) =>
            update({ wounds: character.wounds!.filter((_, idx) => idx !== i) })
          }
          emptyRow={{ description: "", severity: "", days: 0 }}
        />
      </section>
      <section className="panel">
        <div className="panel-title">Status Effects</div>
        <DynamicTable
          readOnly={readOnly}
          columns={[{ key: "description", label: "Effect" }]}
          rows={(character.statusEffects ?? []) as unknown as DynRow[]}
          onChange={(rows) =>
            update({ statusEffects: rows as unknown as Character["statusEffects"] })
          }
          onAdd={(empty) =>
            update({
              statusEffects: [
                ...(character.statusEffects ?? []),
                { ...empty, id: crypto.randomUUID() } as NonNullable<
                  Character["statusEffects"]
                >[number],
              ],
            })
          }
          onRemove={(i) =>
            update({
              statusEffects: character.statusEffects!.filter((_, idx) => idx !== i),
            })
          }
          emptyRow={{ description: "" }}
        />
      </section>
    </>
  );
}
