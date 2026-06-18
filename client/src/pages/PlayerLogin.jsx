import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { playerLogin } from '../api';
import './PlayerLogin.css';

const TOKEN_KEY = 'witcher_player_token';

export function getPlayerToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setPlayerToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearPlayerToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export default function PlayerLogin() {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await playerLogin(nickname);
      setPlayerToken(result.token);
      navigate('/play/sheet');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="player-login">
      <Link to="/" className="back-link">← Home</Link>
      <div className="login-card panel">
        <div className="medallion-sm">🐺</div>
        <h1>Player Login</h1>
        <p className="login-hint">Enter the nickname your DM assigned to your character.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="primary" disabled={loading || !nickname.trim()}>
            {loading ? 'Connecting...' : 'Open My Sheet'}
          </button>
        </form>
      </div>
    </div>
  );
}
