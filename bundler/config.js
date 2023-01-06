import fs from "fs";

import json from "@rollup/plugin-json";

import { addonTransformer, hmrPlugin } from "./hmr/rollup-plugins.js";

export default function buildConfig() {
  const addons = JSON.parse(fs.readFileSync("addons/addons.json", "utf-8")).filter((v) => !v.startsWith("//"));
  const manifests = Object.fromEntries(
    addons.map((addonId) => [addonId, JSON.parse(fs.readFileSync(`addons/${addonId}/addon.json`, "utf-8"))])
  );

  /**
   * @type {import("rollup").RollupOptions}
   */
  return [
    {
      input: "content-scripts/inject/module.js",
      output: {
        file: "build/inject.js",
        format: "es",
      },
      plugins: [hmrPlugin(false)],
    },
    {
      input: "content-scripts/cs.js",
      output: {
        file: "build/cs.js",
        format: "es",
      },
      plugins: [hmrPlugin(false)],
    },
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
      plugins: [
        json({
          preferConst: true,
          compact: true,
          namedExports: true,
        }),
        addonTransformer(),
      ],
    },
  ];
}
