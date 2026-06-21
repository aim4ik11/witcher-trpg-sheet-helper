import { Navigate, Route, Routes } from 'react-router-dom';
import MainScreen from './screens/MainScreen';
import LocalScreen from './screens/LocalScreen';
import DMDashboardScreen from './screens/DMDashboardScreen';
import CharacterViewScreen from './screens/CharacterViewScreen';
import './styles.scss';

const App = () => (
  <Routes>
    <Route path="/"                           element={<MainScreen />} />
    <Route path="/local"                      element={<LocalScreen />} />
    <Route path="/session"                    element={<DMDashboardScreen />} />
    <Route path="/session/character/:id"      element={<CharacterViewScreen />} />
    <Route path="*"                           element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
