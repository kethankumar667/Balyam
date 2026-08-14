import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AudioProvider } from "./context/AudioContext";
import { resolveTheme } from "./lib/useTheme";
import "./index.css";

// Stamped before React mounts so the first paint is already the right palette
// rather than flashing the wrong one. The rule itself lives in useTheme.ts —
// this file used to carry a second copy of it, which is how the two ended up
// able to disagree about what a first-time visitor sees.
document.documentElement.setAttribute("data-theme", resolveTheme());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AudioProvider>
        <App />
      </AudioProvider>
    </BrowserRouter>
  </React.StrictMode>
);
