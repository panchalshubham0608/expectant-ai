import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: '/expectant-ai/',
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Pregnancy Companion",
        short_name: "Pregnancy",
        description: "AI-powered pregnancy companion for tracking health, reports, nutrition and milestones.",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
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
});