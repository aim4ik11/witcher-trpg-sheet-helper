import { useEffect, useState, type CSSProperties } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents, Player, GameEvent } from '@wilmak/shared';

// No URL -> same origin that served this page (the GM server) -> no CORS in prod.
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();

const wrap: CSSProperties = { maxWidth: 460, margin: '40px auto', padding: 24, fontFamily: 'system-ui, sans-serif' };
const input: CSSProperties = { display: 'block', width: '100%', padding: 10, margin: '8px 0', boxSizing: 'border-box' };

export default function App() {
  const [joined, setJoined] = useState(false);
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [roster, setRoster] = useState<Player[]>([]);
  const [log, setLog] = useState<GameEvent[]>([]);

  useEffect(() => {
    socket.on('players:update', setRoster);
    socket.on('game:event', (ev) => setLog((l) => [...l, ev]));
    return () => {
      socket.off('players:update');
      socket.off('game:event');
    };
  }, []);

  const join = (): void => {
    socket.emit('join', { nickname, code }, (res) => {
      if (res.ok) {
        setJoined(true);
        setError('');
      } else {
        setError(res.error ?? 'Помилка приєднання');
      }
    });
  };

  if (!joined) {
    return (
      <div style={wrap}>
        <h2>Приєднатися до сесії</h2>
        <input style={input} placeholder="Нікнейм" value={nickname} onChange={(e) => setNickname(e.target.value)} />
        <input style={input} placeholder="Код" value={code} onChange={(e) => setCode(e.target.value)} />
        <button onClick={join}>Увійти</button>
        {error && <p style={{ color: '#e06c75' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={wrap}>
      <h2>Лобі — {nickname}</h2>
      <p>
        <b>Гравці:</b> {roster.map((p) => p.nickname).join(', ')}
      </p>
      <button onClick={() => socket.emit('player:action', { kind: 'wave' })}>Надіслати дію</button>
      <h4>Події</h4>
      <ul>
        {log.map((e, i) => (
          <li key={i}>
            <b>{e.from}:</b> {JSON.stringify(e.payload)}
          </li>
        ))}
      </ul>
    </div>
  );
}
