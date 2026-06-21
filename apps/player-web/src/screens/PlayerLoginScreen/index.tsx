import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlayerCredential, JoinAck } from '@wilmak/shared';
import { io } from 'socket.io-client';
import { setToken } from '../../api';

export default function PlayerLoginScreen() {
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const socket = io({ path: '/socket.io', autoConnect: true });

    socket.on('connect', () => {
      const cred: PlayerCredential = { nickname: nickname.trim(), code: code.trim() };
      socket.emit('join', cred, (ack: JoinAck) => {
        setLoading(false);
        if (ack.ok && ack.token) {
          setToken(ack.token);
          socket.disconnect();
          navigate('/sheet');
        } else {
          setError(ack.error ?? 'Помилка входу');
          socket.disconnect();
        }
      });
    });

    socket.on('connect_error', () => {
      setLoading(false);
      setError('Не вдалося підключитися до сервера');
    });
  }

  return (
    <div className="player-login">
      <div className="login-card panel">
        <div className="medallion-sm">🐺</div>
        <h1>Player Login</h1>
        <p className="login-hint">Введіть нікнейм та код, які дав вам DM.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text" placeholder="Нікнейм" value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoFocus autoComplete="off" autoCapitalize="off"
          />
          <input
            type="text" placeholder="Код" value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="primary" disabled={loading || !nickname.trim() || !code.trim()}>
            {loading ? 'Підключення...' : 'Відкрити мій аркуш'}
          </button>
        </form>
      </div>
    </div>
  );
}
