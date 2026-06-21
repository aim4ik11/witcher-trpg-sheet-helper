import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { SessionConfig, ServerInfo, Player } from '@wilmak/shared';
import './styles.scss';

type Mode = 'local' | 'remote' | null;

export default function App() {
  const [mode, setMode] = useState<Mode>(null);
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [server, setServer] = useState<ServerInfo | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => window.api.onPlayersUpdate(setPlayers), []);

  const pick = async (): Promise<void> => {
    const c = await window.api.pickConfig();
    if (c) setConfig(c);
  };
  const start = async (): Promise<void> => {
    if (config) setServer(await window.api.startSession(config));
  };

  if (!mode) {
    return (
      <div className="wrap">
        <h1>Вільмак — Гейммайстер</h1>
        <p className="muted">Оберіть тип сесії.</p>
        <div className="choices">
          <div className="card">
            <h3>Локальна сесія</h3>
            <p className="muted">Сервер у вашій WiFi-мережі.</p>
            <button onClick={() => setMode('local')}>Обрати</button>
          </div>
          <div className="card">
            <h3>Віддалена сесія</h3>
            <p className="muted">Підключення до зовнішнього сервера.</p>
            <button disabled>Скоро</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <h1>Локальна сесія</h1>
      {!server && (
        <div className="card">
          <p>1. Завантажте файл налаштувань сесії (нікнейми гравців і коди).</p>
          <button className="ghost" onClick={pick}>Завантажити файл сесії…</button>
          {config && (
            <p className="muted">
              Завантажено: <b>{config.sessionName}</b> · гравців: {config.players.length}
            </p>
          )}
          <p style={{ marginTop: 20 }}>2. Підняти сервер.</p>
          <button onClick={start} disabled={!config}>Підняти сесію</button>
        </div>
      )}
      {server && (
        <>
          <div className="card">
            <h3>Сервер працює</h3>
            <p className="muted">Гравці у вашій мережі відкривають цю адресу або скан QR:</p>
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
                <button className="ghost" onClick={() => window.api.kickPlayer(p.socketId)}>Виключити</button>
              </div>
            ))}
            <button style={{ marginTop: 12 }} onClick={() => window.api.broadcast({ text: 'Сесія починається!' })}>
              Тест: розіслати подію гравцям
            </button>
          </div>
        </>
      )}
    </div>
  );
}
