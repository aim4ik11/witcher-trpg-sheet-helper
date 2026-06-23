import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PlayerLoginScreen from "./screens/PlayerLoginScreen";
import PlayerSheetScreen from "./screens/PlayerSheetScreen";
import "./index.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlayerLoginScreen />} />
        <Route path="/sheet" element={<PlayerSheetScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
