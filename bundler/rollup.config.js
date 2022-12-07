import fs from "fs";
import hash from "./hash.js";
import { addonPlugin } from "./scripts/hmr/rollup-plugins.js";

/** @type {string[]} */
const addonJSON = JSON.parse(fs.readFileSync("./addons/addons.json", "utf-8"));
/**
 * @type {import("rollup").RollupOptions}
 */
export default [
  ...addonJSON
    .filter((v) => !v.startsWith("//"))
    .map((addon) => {
      const addonJSON = JSON.parse(fs.readFileSync(`./addons/${addon}/addon.json`));
      return (addonJSON.userscripts || []).map(({ url }) => {
        /**
         * @type {import("rollup").RollupOptions}
         */
        const config = {
          input: `./addons/${addon}/${url}`,
          output: {
            file: `./build/addons/${hash(addon, url)}.js`,
            format: "iife",
          },
          plugins: [addonPlugin(addon, url)],
        };
        return config;
      });
    }),
].flat();
