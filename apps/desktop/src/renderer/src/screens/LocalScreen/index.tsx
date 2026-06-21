import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAppStore } from '../../store';

const LocalScreen = () => {
  const navigate = useNavigate();
  const { config, server, players, setConfig, setServer, setPlayers } = useAppStore();

  useEffect(() => {
    return window.api.onPlayersUpdate(setPlayers);
  }, [setPlayers]);

  const pickConfig = async () => {
    const c = await window.api.pickConfig();
    if (c) setConfig(c);
  };

  const startSession = async () => {
    if (!config) return;
    const info = await window.api.startSession(config);
    setServer(info);
  };

  const handleBack = () => {
    setConfig(null);
    setServer(null);
    setPlayers([]);
    navigate('/');
  };

  return (
    <div className="wrap">
      <div className="row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <h1 style={{ margin: 0 }}>Локальна сесія</h1>
        <button className="ghost" onClick={handleBack}>← Назад</button>
      </div>

      {!server && (
        <div className="card">
          <p>1. Завантажте файл налаштувань сесії.</p>
          <button className="ghost" onClick={pickConfig}>Завантажити файл сесії…</button>
          {config && (
            <p className="muted">
              Завантажено: <b>{config.sessionName}</b> · гравців: {config.players.length}
            </p>
          )}
          <p style={{ marginTop: 20 }}>2. Підняти сервер.</p>
          <button onClick={startSession} disabled={!config}>Підняти сесію</button>
        </div>
      )}

      {server && (
        <>
          <div className="card">
            <h3>Сервер працює</h3>
            <p className="muted">Гравці у вашій мережі відкривають цю адресу або сканують QR:</p>
            {server.urls.map((u) => (
              <div key={u} className="row">
                <span className="url">{u}</span>
                <QRCodeSVG value={u} size={88} bgColor="#1e1c28" fgColor="#ece9f5" />
              </div>
            ))}
          </div>

          <div className="card">
            <h3>Гравці в лобі ({players.length})</h3>
            {players.length === 0 && <p className="muted">Поки нікого. Чекаємо підключень…</p>}
            {players.map((p) => (
              <div key={p.socketId} className="row">
                <span>{p.nickname}</span>
                <button className="ghost" onClick={() => window.api.kickPlayer(p.socketId)}>
                  Виключити
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LocalScreen;
