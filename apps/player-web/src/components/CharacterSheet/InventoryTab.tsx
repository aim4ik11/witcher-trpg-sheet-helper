import type { Character } from "@wilmak/shared";

interface Props {
  character: Character;
}

export default function InventoryTab({ character }: Props) {
  const consumables = character.consumables ?? [];

  return (
    <section className="panel">
      <div className="panel-title">Consumables</div>
      {consumables.length === 0 ? (
        <p className="readonly-empty">None</p>
      ) : (
        <div className="dynamic-table-wrap">
          <table className="dynamic-table">
            <thead>
              <tr>
                <th>Qty</th>
                <th>Name</th>
                <th>Effect</th>
                <th>Wt</th>
              </tr>
            </thead>
            <tbody>
              {consumables.map((c) => (
                <tr key={c.id ?? c.name}>
                  <td>{c.qty}</td>
                  <td>{c.name}</td>
                  <td>{c.effect}</td>
                  <td>{c.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
