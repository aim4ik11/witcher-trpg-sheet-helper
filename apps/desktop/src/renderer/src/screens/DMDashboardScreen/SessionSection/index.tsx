import { useState } from "react";
import type { PlayerCredential } from "@wilmak/shared";
import QrConnectModal from "../../../components/QrConnectModal";
import AddInviteModal from "../../../components/AddInviteModal";
import PlayerConnectionSection from "./PlayerConnectionSection";
import LobbySection from "./LobbySection";

interface Props {
  playUrls: string[];
  credentials: PlayerCredential[];
  serverActive: boolean;
  onAddInvite: (nickname: string) => Promise<void>;
}

export default function SessionSection({
  playUrls,
  credentials,
  serverActive,
  onAddInvite,
}: Props) {
  const [qrOpen, setQrOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  async function handleAddInvite(nickname: string) {
    await onAddInvite(nickname);
    setInviteOpen(false);
  }

  async function handleRemovePlayer(nickname: string) {
    await window.api.removeCredential(nickname);
  }

  return (
    <>
      <PlayerConnectionSection playUrls={playUrls} onQrOpen={() => setQrOpen(true)} />
      <LobbySection
        credentials={credentials}
        playUrls={playUrls}
        serverActive={serverActive}
        onAddPlayer={() => setInviteOpen(true)}
        onRemovePlayer={handleRemovePlayer}
      />

      {qrOpen && <QrConnectModal playUrls={playUrls} onClose={() => setQrOpen(false)} />}
      {inviteOpen && (
        <AddInviteModal onSubmit={handleAddInvite} onClose={() => setInviteOpen(false)} />
      )}
    </>
  );
}
