import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

const apiUrl = process.env.WXT_API_URL ?? "http://localhost:3000";

export default defineConfig({
  outDir: "dist",
  srcDir: ".",
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
    define: {
      "import.meta.env.WXT_API_URL": JSON.stringify(apiUrl),
    },
  }),
  manifest: {
    name: "Pulse",
    description: "A high-signal developer news feed on every new tab.",
    version: "0.1.0",
    permissions: ["storage"],
    host_permissions: [`${apiUrl}/*`],
  },
});
