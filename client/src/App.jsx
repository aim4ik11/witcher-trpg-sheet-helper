import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DMDashboard from './pages/DMDashboard';
import PlayerLogin from './pages/PlayerLogin';
import PlayerSheet from './pages/PlayerSheet';
import CharacterView from './pages/CharacterView';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dm" element={<DMDashboard />} />
      <Route path="/dm/character/:id" element={<CharacterView />} />
      <Route path="/play" element={<PlayerLogin />} />
      <Route path="/play/sheet" element={<PlayerSheet />} />
    </Routes>
  );
}
