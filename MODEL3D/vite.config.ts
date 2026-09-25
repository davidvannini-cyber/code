import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: '/code/MODEL3D/',
  plugins: [react()],
  assetsInclude: ["**/*.wasm"],
  worker: {
    format: "es"
  },
  server: {
    host: true,
    port: 5173
  }
});
