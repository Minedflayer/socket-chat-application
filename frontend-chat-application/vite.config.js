import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define:{
    global: 'window',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',  
      "/auth": "http://localhost:8080",
      "/chat": {
        //target: "http://localhost:8080", // Spring Boot backend
        target: 'http://127.0.0.1:8080',
        ws: true,
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/chat/, '/chat')
      },
    },
  },
});
