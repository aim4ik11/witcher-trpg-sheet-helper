import { QRCodeSVG } from "qrcode.react";
import Modal from "../Modal";
import "./QrConnectModal.css";

interface Props {
  playUrls: string[];
  onClose: () => void;
}

export default function QrConnectModal({ playUrls, onClose }: Props) {
  const primaryUrl = playUrls[0] ?? "";

  return (
    <Modal
      title="Scan to Join"
      size="md"
      onClose={onClose}
      footer={
        primaryUrl ? (
          <button
            type="button"
            className="primary"
            onClick={() => navigator.clipboard.writeText(primaryUrl)}
          >
            Copy link
          </button>
        ) : undefined
      }
    >
      <p className="qr-modal-hint">
        Players scan with their phone camera (same WiFi required)
      </p>
      {primaryUrl ? (
        <>
          <div className="qr-code-wrap">
            <QRCodeSVG
              value={primaryUrl}
              size={240}
              level="M"
              includeMargin
              bgColor="#141210"
              fgColor="#eae3d6"
            />
          </div>
          <code className="qr-modal-url">{primaryUrl}</code>
          {playUrls.length > 1 && (
            <p className="qr-modal-alt">
              Other addresses: {playUrls.slice(1).join(", ")}
            </p>
          )}
        </>
      ) : (
        <p className="qr-modal-empty">No network address found. Check WiFi.</p>
      )}
    </Modal>
  );
}
