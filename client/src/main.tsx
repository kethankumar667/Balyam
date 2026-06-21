import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AudioProvider } from "./context/AudioContext";
import "./index.css";

const THEME_STORAGE_KEY = "bhalyam.theme";
const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
const bootTheme =
  storedTheme === "light" || storedTheme === "dark"
    ? storedTheme
    : window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

document.documentElement.setAttribute("data-theme", bootTheme);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AudioProvider>
        <App />
      </AudioProvider>
    </BrowserRouter>
  </React.StrictMode>
);
