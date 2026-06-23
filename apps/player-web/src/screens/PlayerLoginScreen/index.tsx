import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken } from '../../api';
import { joinSession } from '../../socket';

export default function PlayerLoginScreen() {
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ack = await joinSession({
        nickname: nickname.trim(),
        code: code.trim(),
      });
      if (ack.ok && ack.token) {
        setToken(ack.token);
        navigate('/sheet');
      } else {
        setError(ack.error ?? 'Помилка входу');
      }
    } catch {
      setError('Не вдалося підключитися до сервера');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="player-login">
      <div className="login-card panel">
        <div className="medallion-sm">🐺</div>
        <h1>Player Login</h1>
        <p className="login-hint">Введіть нікнейм та код, які дав вам DM.</p>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <input
            type="text" placeholder="Нікнейм" value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoFocus autoComplete="off" autoCapitalize="off"
          />
          <input
            type="text" placeholder="Код" value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off" inputMode="numeric"
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
