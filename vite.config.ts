import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import { lucideSubset } from "./vite-plugin-lucide-subset";

const host = process.env.TAURI_DEV_HOST;

const visualReviewDimensionMarkers = [
  ["max-w", "[1800px]"],
  ["min-h", "[590px]"],
].flatMap(([utility, value]) => {
  const marker = `${utility}-${value}`;
  return [marker, marker.replace("[", String.raw`\[`).replace("]", String.raw`\]`)];
});

const visualReviewProductionMarkers = [
  "visual-review",
  "Voltius visual review",
  "Deterministic local fixture",
  "quarterly-financial-report-final-reviewed.pdf",
  "Handsome Light",
  "--vr-bg",
  "--vr-border",
  "--vr-accent",
  "--vr-text",
  ...visualReviewDimensionMarkers,
];

function visualReviewProductionIsolation(): Plugin {
  return {
    name: "visual-review-production-isolation",
    apply: "build",
    generateBundle(_options, bundle) {
      const leaks = Object.entries(bundle).flatMap(([fileName, output]) => {
        const content = output.type === "chunk" ? output.code : output.source.toString();
        return visualReviewProductionMarkers
          .filter((marker) => content.includes(marker))
          .map((marker) => `${fileName}: ${marker}`);
      });

      if (leaks.length > 0) {
        this.error(`Visual-review content leaked into the production bundle:\n${leaks.join("\n")}`);
      }
    },
  };
}

export default defineConfig(async () => ({
  plugins: [react(), svgr(), lucideSubset(), visualReviewProductionIsolation()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (["@xterm/xterm", "@xterm/addon-fit", "@xterm/addon-webgl", "@xterm/addon-search", "@xterm/addon-web-links"].some((pkg) => id.includes(`/node_modules/${pkg}/`))) return "xterm";
          if (["react", "react-dom"].some((pkg) => id.includes(`/node_modules/${pkg}/`))) return "react";
        },
      },
    },
  },
  clearScreen: false,
  server: {
    port: parseInt(process.env.VITE_PORT ?? "1420"),
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
