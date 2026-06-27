import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setToken } from "../../api";
import { joinSession } from "../../socket";

export default function PlayerLoginScreen() {
  const [searchParams] = useSearchParams();
  const [nickname, setNickname] = useState(searchParams.get("nickname") ?? "");
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(nick: string, c: string) {
    setError("");
    setLoading(true);
    try {
      const ack = await joinSession({ nickname: nick.trim(), code: c.trim() });
      if (ack.ok && ack.token) {
        setToken(ack.token);
        navigate("/sheet");
      } else {
        setError(ack.error ?? "Помилка входу");
      }
    } catch {
      setError("Не вдалося підключитися до сервера");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const nick = searchParams.get("nickname");
    const c = searchParams.get("code");
    if (nick && c) {
      void submit(nick, c);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submit(nickname, code);
  }

  return (
    <div className="player-login">
      <div className="login-card panel">
        <div className="medallion-sm">🐺</div>
        <h1>Player Login</h1>
        <p className="login-hint">Введіть нікнейм та код, які дав вам DM.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Нікнейм"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
          />
          <input
            type="text"
            placeholder="Код"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            inputMode="numeric"
          />
          {error && <p className="login-error">{error}</p>}
          <button
            type="submit"
            className="primary"
            disabled={loading || !nickname.trim() || !code.trim()}
          >
            {loading ? "Підключення..." : "Відкрити мій аркуш"}
          </button>
        </form>
      </div>
    </div>
  );
}
