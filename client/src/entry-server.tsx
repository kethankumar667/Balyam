import React from "react";
import ReactDOMServer from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import App from "./App";
import { AudioProvider } from "./context/AudioContext";
import { PUBLIC_ROUTES_METADATA } from "./seo/metadata";

export function render(url: string) {
  const metadata = PUBLIC_ROUTES_METADATA[url] || PUBLIC_ROUTES_METADATA["/"];
  
  const appHtml = ReactDOMServer.renderToString(
    <React.StrictMode>
      <StaticRouter location={url}>
        <AudioProvider>
          <App />
        </AudioProvider>
      </StaticRouter>
    </React.StrictMode>
  );

  return { appHtml, metadata };
}
