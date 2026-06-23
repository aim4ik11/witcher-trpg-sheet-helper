import { useCallback } from "react";
import type { PlayerCredential } from "@wilmak/shared";
import { useAppStore } from "../store";
import { withPlayers } from "../utils/session";

export function useCredentialsSync(): (
  credentials: PlayerCredential[],
) => Promise<void> {
  const setConfig = useAppStore((s) => s.setConfig);
  const setCredentials = useAppStore((s) => s.setCredentials);

  return useCallback(
    async (credentials: PlayerCredential[]) => {
      setCredentials(credentials);

      const current = useAppStore.getState().config;
      if (!current) return;

      const updated = withPlayers(current, credentials);
      setConfig(updated);
      await window.api.saveLastSession(updated);
    },
    [setConfig, setCredentials],
  );
}
