function urlLabel(url: string, index: number): string {
  if (url.includes("192.168.") || url.includes("10.0.") || url.includes("172."))
    return index === 0 ? "Wi-Fi" : "Network";
  return "URL";
}

interface Props {
  playUrls: string[];
  onQrOpen: () => void;
}

export default function PlayerConnectionSection({ playUrls, onQrOpen }: Props) {
  return (
    <section className="dm-section">
      <div className="dm-section-head">
        <h2>Player connection</h2>
        <span className="dm-section-sub">same WiFi</span>
        <div className="dm-section-actions">
          <button type="button" className="btn-sm" onClick={onQrOpen}>
            QR Code
          </button>
        </div>
      </div>
      {playUrls.length > 0 ? (
        <div className="host-panel">
          {playUrls.map((url, i) => (
            <div key={url} className="host-url-row">
              <span className="host-url-label">{urlLabel(url, i)}</span>
              <code>{url}</code>
              <button
                type="button"
                className="btn-sm"
                onClick={() => navigator.clipboard.writeText(url)}
              >
                Copy
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="host-warn">No network URLs available.</p>
      )}
    </section>
  );
}
