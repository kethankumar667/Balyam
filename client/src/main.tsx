import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AudioProvider } from "./context/AudioContext";
import { resolveTheme } from "./lib/useTheme";
import { initLayoutGuard } from "./lib/layoutGuard";
import { initErrorMonitoring } from "./lib/errorMonitoring";
import { timelineRecorder } from "./core/events/TimelineRecorder";
import "./index.css";

if (typeof document !== "undefined") {
  initErrorMonitoring();
  timelineRecorder.start();
  document.documentElement.setAttribute("data-theme", resolveTheme());
  initLayoutGuard();

  // Self-heal when Vite dynamic import fails due to stale chunk hashes or HMR updates
  window.addEventListener("vite:preloadError", () => {
    const key = "bhalyam_chunk_reload";
    const lastReload = sessionStorage.getItem(key);
    if (!lastReload || Date.now() - Number(lastReload) > 10000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  });
}

const rootElement = document.getElementById("root")!;

const appNode = (
  <React.StrictMode>
    <BrowserRouter>
      <AudioProvider>
        <App />
      </AudioProvider>
    </BrowserRouter>
  </React.StrictMode>
);

if (rootElement.hasChildNodes()) {
  ReactDOM.hydrateRoot(rootElement, appNode);
} else {
  ReactDOM.createRoot(rootElement).render(appNode);
}
