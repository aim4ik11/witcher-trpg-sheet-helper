import { Link } from 'react-router-dom';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="home">
      <div className="home-hero">
        <div className="medallion">🐺</div>
        <h1>Witcher TRPG</h1>
        <p className="subtitle">Sheet Helper</p>
        <p className="desc">
          Digital character sheets for your tabletop sessions.
          Fast counters, real-time sync, no erasing on paper.
        </p>
      </div>
      <div className="home-actions">
        <Link to="/dm" className="home-btn dm">
          <span className="btn-icon">⚔</span>
          <span>
            <strong>DM Host</strong>
            <small>Manage all characters</small>
          </span>
        </Link>
        <Link to="/play" className="home-btn player">
          <span className="btn-icon">📜</span>
          <span>
            <strong>Player</strong>
            <small>Connect with nickname</small>
          </span>
        </Link>
      </div>
    </div>
  );
}
