import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// No URL -> connects to the SAME origin that served this page (the GM server).
// Same origin = no CORS in production.
const socket = io();

const wrap = { maxWidth: 460, margin: '40px auto', padding: 24, fontFamily: 'system-ui, sans-serif' };
const input = { display: 'block', width: '100%', padding: 10, margin: '8px 0', boxSizing: 'border-box' };

export default function App() {
  const [joined, setJoined] = useState(false);
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [roster, setRoster] = useState([]);
  const [log, setLog] = useState([]);

  useEffect(() => {
    socket.on('players:update', setRoster);
    socket.on('game:event', (ev) => setLog((l) => [...l, ev]));
    return () => { socket.off('players:update'); socket.off('game:event'); };
  }, []);

  const join = () => {
    socket.emit('join', { nickname, code }, (res) => {
      if (res?.ok) { setJoined(true); setError(''); }
      else setError(res?.error || 'Помилка приєднання');
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
      <p><b>Гравці:</b> {roster.map((p) => p.nickname).join(', ')}</p>
      <button onClick={() => socket.emit('player:action', { kind: 'wave' })}>Надіслати дію</button>
      <h4>Події</h4>
      <ul>{log.map((e, i) => <li key={i}><b>{e.from}:</b> {JSON.stringify(e.payload)}</li>)}</ul>
    </div>
  );
}
