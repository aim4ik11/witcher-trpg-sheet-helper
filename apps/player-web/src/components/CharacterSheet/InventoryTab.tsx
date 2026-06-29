import type { Character } from "@wilmak/shared";

interface Props {
  character: Character;
}

export default function InventoryTab({ character }: Props) {
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
      {inventory.length === 0 ? (
        <p className="readonly-empty">None</p>
      ) : (
        <div className="dynamic-table-wrap">
          <table className="dynamic-table">
            <thead>
              <tr>
                <th>Qty</th>
                <th>Name</th>
                <th>Category</th>
                <th>Effect</th>
                <th>Wt</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((c) => (
                <tr key={c.id ?? c.name}>
                  <td>{c.qty}</td>
                  <td>{c.name}</td>
                  <td>{c.category}</td>
                  <td>{c.effect}</td>
                  <td>{c.weight}</td>
                  <td>{c.cost ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
