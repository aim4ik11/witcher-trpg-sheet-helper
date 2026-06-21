import { Navigate, Route, Routes } from 'react-router-dom';
import LocalScreen from './screens/LocalScreen';
import MainScreen from './screens/MainScreen';
import './styles.scss';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<MainScreen />} />
      <Route path="/local" element={<LocalScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
