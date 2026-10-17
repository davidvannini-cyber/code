import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In sviluppo l'app gira su http://localhost:5173/; la sottocartella serve solo alla build pubblicata.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/code/MODEL3D/" : "/",
  plugins: [react()],
  assetsInclude: ["**/*.wasm"],
  worker: {
    format: "es"
  },
  server: {
    host: true,
    port: 5173
  }
}));
