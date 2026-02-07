import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "client"),
  publicDir: path.resolve(__dirname, "public"),
  envDir: path.resolve(__dirname),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "/src": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom")) return "vendor";
            if (id.includes("framer-motion")) return "vendor";
            if (id.includes("wouter")) return "vendor";
            if (id.includes("@radix-ui")) return "ui";
            if (id.includes("recharts") || id.includes("d3-")) return "charts";
            if (id.includes("mapbox-gl")) return "mapbox";
          }
        },
      },
    },
  },
  server: {
    // FIX: This proxy forwards frontend API calls to the Express backend (Port 5000)
    proxy: {
      "/api": {
        target: "http://0.0.0.0:5000",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "http://0.0.0.0:5000",
        ws: true,
      },
    },
    allowedHosts: ["makewego.unusualbeautymodel.com"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});