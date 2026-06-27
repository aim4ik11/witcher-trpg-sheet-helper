import { QRCodeSVG } from "qrcode.react";
import type { PlayerCredential } from "@wilmak/shared";
import Modal from "../Modal";
import "../QrConnectModal/QrConnectModal.css";

interface Props {
  credential: PlayerCredential;
  inviteUrl: string;
  onClose: () => void;
}

export default function PlayerInviteQrModal({ credential, inviteUrl, onClose }: Props) {
  return (
    <Modal
      title={`Invite: ${credential.nickname}`}
      size="md"
      onClose={onClose}
      footer={
        inviteUrl ? (
          <button
            type="button"
            className="primary"
            onClick={() => void navigator.clipboard.writeText(inviteUrl)}
          >
            Copy link
          </button>
        ) : undefined
      }
    >
      <p className="qr-modal-hint">
        Player scans with their phone — logs in automatically
      </p>
      {inviteUrl ? (
        <>
          <div className="qr-code-wrap">
            <QRCodeSVG
              value={inviteUrl}
              size={240}
              level="M"
              includeMargin
              bgColor="#141210"
              fgColor="#eae3d6"
            />
          </div>
          <code className="qr-modal-url">{inviteUrl}</code>
        </>
      ) : (
        <p className="qr-modal-empty">No network address found. Check WiFi.</p>
      )}
    </Modal>
  );
}
