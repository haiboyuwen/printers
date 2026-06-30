import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { execSync } from "child_process";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfjsPkg = JSON.parse(
  readFileSync(path.resolve(__dirname, "node_modules/pdfjs-dist/package.json"), "utf8")
);
const PDFJS_VERSION = pdfjsPkg.version;

function getLocalPrinters(): string[] {
  try {
    const out = execSync("lpstat -a 2>/dev/null", { encoding: "utf8", timeout: 3000 });
    const lines = out.trim().split("\n").filter(Boolean);
    return lines.map((line) => {
      const m = line.match(/^([a-zA-Z0-9_-]+)/);
      return m ? m[1] : "";
    }).filter(Boolean);
  } catch {
    return [];
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __PDFJS_VERSION__: JSON.stringify(PDFJS_VERSION),
  },
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(),
    {
      name: "printers-api",
      configureServer(server) {
        server.middlewares.use("/api/printers", (_req, res) => {
          const printers = getLocalPrinters();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ printers }));
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
