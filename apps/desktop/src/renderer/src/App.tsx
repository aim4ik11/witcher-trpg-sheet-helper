import { Navigate, Route, Routes } from "react-router-dom";
import MainScreen from "./screens/MainScreen";
import DMDashboardScreen from "./screens/DMDashboardScreen";
import CharacterViewScreen from "./screens/CharacterViewScreen";
import LocalSessionInitScreen from './screens/LocalSessionInitScreen';
import GeneralLayout from "./components/layouts/GeneralLayout";
import "./styles.scss";

const App = () => (
  <GeneralLayout>
    <Routes>
      <Route path="/" element={<MainScreen />} />
      <Route path="/local-init" element={<LocalSessionInitScreen />} />
      <Route path="/session" element={<DMDashboardScreen />} />
      <Route path="/session/character/:id" element={<CharacterViewScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </GeneralLayout>
);

export default App;
