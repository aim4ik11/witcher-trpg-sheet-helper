import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './QrConnectModal.css';

export function buildPlayUrls(hostInfo) {
  if (!hostInfo?.urls?.length) return [];
  const port = window.location.port ? `:${window.location.port}` : '';
  return hostInfo.urls.map((url) => {
    const ip = url.replace(/^https?:\/\//, '').split(':')[0];
    return `http://${ip}${port}/play`;
  });
}

export default function QrConnectModal({ playUrls, onClose }) {
  const primaryUrl = playUrls[0] ?? '';

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
    <div className="qr-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="qr-modal panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
      >
        <button type="button" className="qr-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 id="qr-modal-title" className="qr-modal-title">Scan to Join</h2>
        <p className="qr-modal-hint">Players scan with their phone camera (same WiFi required)</p>

        {primaryUrl ? (
          <>
            <div className="qr-code-wrap">
              <QRCodeSVG
                value={primaryUrl}
                size={240}
                level="M"
                includeMargin
                bgColor="#2a2218"
                fgColor="#e8dcc8"
              />
            </div>
            <code className="qr-modal-url">{primaryUrl}</code>
            <div className="qr-modal-actions">
              <button
                type="button"
                className="primary"
                onClick={() => navigator.clipboard.writeText(primaryUrl)}
              >
                Copy link
              </button>
            </div>
            {playUrls.length > 1 && (
              <p className="qr-modal-alt">
                Other addresses: {playUrls.slice(1).join(', ')}
              </p>
            )}
          </>
        ) : (
          <p className="qr-modal-empty">
            No network address found. Run <code>npm run lan</code> and refresh, or check WiFi.
          </p>
        )}
      </div>
    </div>
  );
}
