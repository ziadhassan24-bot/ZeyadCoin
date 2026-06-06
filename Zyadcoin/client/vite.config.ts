import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Forward any request starting with /api to the Express backend on :3001.
    // This means the browser always talks to one origin (the Vite dev server),
    // so there is no CORS issue in development, and the frontend code can just
    // call fetch("/api/tasks").
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
