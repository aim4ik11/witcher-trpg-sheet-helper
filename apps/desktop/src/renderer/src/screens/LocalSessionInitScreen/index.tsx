import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAppStore } from "../../store";
import { setApiBase } from "../../api";
import PlayerInvitesList from "../../components/PlayerInvitesList";
import "../../components/PlayerInvitesList/PlayerInvitesList.css";
import { useCredentialsSync } from "../../hooks/useCredentialsSync";
import { normalizePlayers } from "../../utils/session";

const LocalSessionInitScreen = () => {
  const navigate = useNavigate();
  const {
    config,
    server,
    players,
    credentials,
    setConfig,
    setServer,
    setPlayers,
    setCredentials,
  } = useAppStore();

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const syncCredentials = useCredentialsSync();

  useEffect(() => {
    if (server) setApiBase(server.port);
  }, [server]);

  useEffect(() => {
    return window.api.onPlayersUpdate(setPlayers);
  }, [setPlayers]);

  useEffect(() => {
    return window.api.onCredentialsUpdate((creds) => {
      void syncCredentials(creds);
    });
  }, [syncCredentials]);

  useEffect(() => {
    if (!server) return;
    void window.api.getCredentials().then((creds) => {
      void syncCredentials(creds);
    });
  }, [server, syncCredentials]);

  useEffect(() => {
    void window.api.loadLastSession().then((c) => {
      if (!c || useAppStore.getState().config) return;
      const players = normalizePlayers(c.players);
      setConfig({ ...c, players });
      setCredentials(players);
    });
  }, [setConfig, setCredentials]);

  const pickConfig = async () => {
    const c = await window.api.pickConfig();
    if (c) {
      const players = normalizePlayers(c.players);
      setConfig({ ...c, players });
      setCredentials(players);
    }
  };

  const startSession = async () => {
    if (!config || starting) return;
    setStarting(true);
    setStartError("");
    try {
      const info = await window.api.startSession(config);
      setServer(info);
      setApiBase(info.port);
      navigate('/session')
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Не вдалося підняти сервер");
    } finally {
      setStarting(false);
    }
  };

  const handleBack = async () => {
    await window.api.stopSession();
    setConfig(null);
    setServer(null);
    setPlayers([]);
    setCredentials([]);
    setStartError("");
    navigate("/");
  };

  const copyCode = (code: string) => {
    void navigator.clipboard.writeText(code);
  };

  return (
    <div className="wrap">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <h1 style={{ margin: 0 }}>Локальна сесія</h1>
        <button className="ghost" onClick={handleBack}>
          ← Назад
        </button>
      </div>

      <div className="card">
        <p>1. Завантажте файл налаштувань сесії.</p>
        <button className="ghost" onClick={pickConfig}>
          Завантажити файл сесії…
        </button>
        {config && (
          <p className="muted">
            {config.sessionName ? (
              <>
                Завантажено: <b>{config.sessionName}</b> · гравців:{" "}
                {config.players.length}
              </>
            ) : (
              <>Остання сесія · гравців: {config.players.length}</>
            )}
          </p>
        )}
        {!config && (
          <p className="muted">
            Немає збереженої сесії. Завантажте файл або створіть нову після старту.
          </p>
        )}
        <p style={{ marginTop: 20 }}>2. Підняти сервер.</p>
        {startError && (
          <p className="muted" style={{ color: "var(--danger)" }}>
            {startError}
          </p>
        )}
        <button
          className="primary"
          onClick={() => void startSession()}
          disabled={!config || starting}
        >
          {starting ? "Запуск…" : "Підняти сесію"}
        </button>
      </div>
    </div>
  );
};

export default LocalSessionInitScreen;
