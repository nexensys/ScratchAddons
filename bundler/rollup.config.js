import fs from "fs";
import { addonTransformer } from "./scripts/hmr/rollup-plugins.js";

/** @type {string[]} */
const addonJSON = JSON.parse(fs.readFileSync("./addons/addons.json", "utf-8"));
/**
 * @type {import("rollup").RollupOptions}
 */
export default [
  {
    input: {
      "custom-zoom/userscript.js": "./addons/custom-zoom/userscript.js",
    },
    output: {
      dir: "build/addons",
      format: "iife",
      sourcemap: true,
      entryFileNames: "[name]",
    },
    plugins: [addonTransformer()],
  } /*,
  ...addonJSON
    .filter((v) => !v.startsWith("//"))
    .map((addon) => {
      const addonJSON = JSON.parse(fs.readFileSync(`./addons/${addon}/addon.json`));
      return (addonJSON.userscripts || []).map(({ url }) => {
        /**
         * @type {import("rollup").RollupOptions}
         */ /*
        const config = {
          input: `./addons/${addon}/${url}`,
          output: {
            file: `./build/addons/${addon}/${url}`,
            format: "iife",
            sourcemap: true,
          },
          plugins: [addonTransformer(addon, url)],
        };
        return config;
      });
    }),*/,
];
