import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Expectant AI",
        short_name: "Expectant AI",
        description: "AI-powered pregnancy companion for tracking health, reports, nutrition and milestones.",
        start_url: "/expectant-ai/",
        display: "standalone",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        icons: [
          {
            src: "expectant-ai.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "expectant-ai.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  base: "/expectant-ai/",
  server: (() => {
    const devHttps = process.env.DEV_HTTPS === 'true' || process.env.DEV_HTTPS === '1' || process.env.DEV_HTTPS === 'true';
    if (!devHttps) return { host: true };

    // Allow optional custom cert/key via env vars DEV_HTTPS_KEY and DEV_HTTPS_CERT
    const keyPath = process.env.DEV_HTTPS_KEY || process.env.DEV_HTTPS_KEY_FILE;
    const certPath = process.env.DEV_HTTPS_CERT || process.env.DEV_HTTPS_CERT_FILE;

    if (keyPath && certPath) {
      try {
        const key = fs.readFileSync(path.resolve(keyPath));
        const cert = fs.readFileSync(path.resolve(certPath));
        return { host: true, https: { key, cert } };
      } catch (err) {
        console.warn('DEV_HTTPS is enabled but failed to read cert/key files, falling back to https: true', err);
        return { host: true, https: {} };
      }
    }

    // Let Vite use its default self-signed/https behaviour
    return { host: true, https: {} };
  })(),
});