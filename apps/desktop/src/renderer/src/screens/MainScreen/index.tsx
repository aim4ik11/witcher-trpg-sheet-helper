import { useState } from 'react';

type Mode = 'local' | 'remote' | null;

const MainScreen = () => {
  const [mode, setMode] = useState<Mode>(null);
  return (
    <div className="wrap">
      <h1>Вільмак — Гейммайстер</h1>
      <p className="muted">Оберіть тип сесії.</p>
      <div className="choices">
        <div className="card">
          <h3>Локальна сесія</h3>
          <p className="muted">Сервер у вашій WiFi-мережі.</p>
          {/* <button onClick={() => setMode('local')}>Обрати</button> */}
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

export default MainScreen;
