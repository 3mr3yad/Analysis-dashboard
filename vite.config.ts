import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { tsconfigPaths: true },
  server: {
    proxy: {
      // The browser sends its own Bearer token from the login session (src/state/auth.ts).
      "/api": {
        target: "https://wafii.sa",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/wafiservices/api/v1"),
      },
    },
  },
});
