import fs from "fs";
import { addonTransformer } from "./scripts/hmr/rollup-plugins.js";

/** @type {string[]} */
const addons = JSON.parse(fs.readFileSync("addons/addons.json", "utf-8")).filter((v) => !v.startsWith("//"));
const manifests = Object.fromEntries(
  addons.map((addonId) => [addonId, JSON.parse(fs.readFileSync(`addons/${addonId}/addon.json`, "utf-8"))])
);

/**
 * @type {import("rollup").RollupOptions}
 */
export default [
  {
    input: Object.fromEntries(
      Object.entries(manifests)
        .map(([addonId, manifest]) => {
          if (!("userscripts" in manifest) || manifest.userscripts.length === 0) return false;
          return manifest.userscripts.map(({ url }) => [`${addonId}/${url}`, `addons/${addonId}/${url}`]);
        })
        .filter(Boolean)
        .flat()
    ),
    output: {
      dir: "build/addons",
      format: "es",
      sourcemap: true,
      entryFileNames: "[name]",
    },
    plugins: [addonTransformer()],
  },
];
