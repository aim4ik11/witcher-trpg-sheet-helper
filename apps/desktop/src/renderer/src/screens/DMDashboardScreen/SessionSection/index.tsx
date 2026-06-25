import { useState } from "react";
import type { Player, PlayerCredential } from "@wilmak/shared";
import QrConnectModal from "../../../components/QrConnectModal";
import AddInviteModal from "../../../components/AddInviteModal";
import PlayerConnectionSection from "./PlayerConnectionSection";
import LobbySection from "./LobbySection";

interface Props {
  playUrls: string[];
  credentials: PlayerCredential[];
  connected: Player[];
  serverActive: boolean;
  onAddInvite: (nickname: string) => Promise<void>;
}

export default function SessionSection({
  playUrls,
  credentials,
  connected,
  serverActive,
  onAddInvite,
}: Props) {
  const [qrOpen, setQrOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  async function handleAddInvite(nickname: string) {
    await onAddInvite(nickname);
    setInviteOpen(false);
  }

  return (
    <>
      <PlayerConnectionSection playUrls={playUrls} onQrOpen={() => setQrOpen(true)} />
      <LobbySection
        credentials={credentials}
        connected={connected}
        serverActive={serverActive}
        onAddPlayer={() => setInviteOpen(true)}
      />

      {qrOpen && <QrConnectModal playUrls={playUrls} onClose={() => setQrOpen(false)} />}
      {inviteOpen && (
        <AddInviteModal onSubmit={handleAddInvite} onClose={() => setInviteOpen(false)} />
      )}
    </>
  );
}
