import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type ConfigEnv } from "wxt";

const PRODUCTION_API_URL = "https://pulse-kappa-green.vercel.app";
const DEV_API_URL = "http://localhost:3000";

// `wxt` (dev) talks to the local API; `wxt build` / `wxt zip` default to production.
// Override either with WXT_API_URL.
function apiUrl({ command }: ConfigEnv): string {
  return process.env.WXT_API_URL ?? (command === "serve" ? DEV_API_URL : PRODUCTION_API_URL);
}

export default defineConfig({
  outDir: "dist",
  srcDir: ".",
  modules: ["@wxt-dev/module-react"],
  vite: (env) => ({
    plugins: [tailwindcss()],
    define: {
      "import.meta.env.WXT_API_URL": JSON.stringify(apiUrl(env)),
    },
  }),
  manifest: (env) => ({
    name: "Pulse",
    description: "A high-signal developer news feed on every new tab.",
    version: "0.1.0",
    permissions: ["storage"],
    host_permissions: [`${apiUrl(env)}/*`],
  }),
});
