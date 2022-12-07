import path from "path";
import process from "process";

import utils from "@rollup/pluginutils";
import MagicString from "magic-string";

import port from "../port.js";

export function hmrPlugin() {
  return {
    name: "sa-dev-hmr",
    resolveImportMeta(property, { moduleId }) {
      switch (property) {
        case "saHmrPort":
          return `${port}`;
        default:
          return null;
      }
    },
  };
}

export function addonLoaderPlugin() {
  const runnerFilter = utils.createFilter(["**/content-scripts/inject/run-userscript.js"]);
  const importerFilter = utils.createFilter(["**/content-scripts/inject/import-addon.js"]);
  return {
    name: `sa-addon-loader`,
    transform(code, id) {
      if (runnerFilter(id)) {
        const s = new MagicString(code);
        s.prepend('import { importAddon } from "./import-addon.js";');
        return {
          code: s.toString(),
          map: s.generateMap({
            hires: true,
          }),
          moduleSideEffects: "no-treeshake",
        };
      } else if (importerFilter(id)) {
        return {
          code,
          map: null,
          moduleSideEffects: "no-treeshake",
        };
      }
      return;
    },
    renderDynamicImport() {
      return {
        left: "importAddon(",
        right: ")",
      };
    },
  };
}

export function addonPlugin(addonId, userscripts) {
  const filter = utils.createFilter(userscripts.map((userscript) => `**/addons/${addonId}/${userscript}`));
  return {
    name: `sa-addon (${addonId})`,
    transform(code, id) {
      if (!filter(id)) return;
      const userscript = userscripts.find((userscript) =>
        utils.createFilter([`**/addons/${addonId}/${userscript}`])(id)
      );
      const s = new MagicString(code);
      const idx = code.indexOf("export default");
      s.update(
        idx,
        idx + 14,
        `(window.scratchAddons["${addonId}"] = (window.scratchAddons["${addonId}"] || {}))["${userscript}"] =`
      );
      return {
        code: s.toString(),
        map: s.generateMap({
          hires: true,
        }),
        moduleSideEffects: "no-treeshake",
      };
    },
  };
}
