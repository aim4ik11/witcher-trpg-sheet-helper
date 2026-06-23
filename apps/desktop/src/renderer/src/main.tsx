import { HashRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App";

function Main() {
  return (
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<Main />);
