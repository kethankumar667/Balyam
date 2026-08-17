import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AudioProvider } from "./context/AudioContext";
import { resolveTheme } from "./lib/useTheme";
import { initLayoutGuard } from "./lib/layoutGuard";
import "./index.css";

if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-theme", resolveTheme());
  initLayoutGuard();
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
