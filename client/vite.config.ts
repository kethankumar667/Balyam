import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    // `host: true` binds Vite to 0.0.0.0 so any device on your LAN (phone,
    // tablet, another laptop) can hit http://<your-pc-ip>:5173/. Without
    // this Vite only listens on 127.0.0.1 and the phone gets ERR_CONNECTION_REFUSED.
    host: true,
    port: 5173,
    // strictPort means Vite fails loudly instead of silently moving to
    // 5174 — saves the "why did the QR-code in the terminal stop working?" hunt.
    strictPort: true,
  },
});
