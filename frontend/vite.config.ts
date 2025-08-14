import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    watch: {
      usePolling: true,
    },
    proxy: {
      "/api": {
        target: process.env.BACKEND_URL || "https://dailyzen-reboot.onrender.com", // Your Rust backend's address
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/api/v1"), // Optional: if you want to use /api in frontend calls
      },
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  
}));