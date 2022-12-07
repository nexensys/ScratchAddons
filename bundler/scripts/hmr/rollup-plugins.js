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

export function addonPlugin(addonId, userscript) {
  const filter = utils.createFilter([`**/addons/${addonId}/${userscript}`]);
  return {
    name: `sa-addon (${addonId})`,
    transform(code, id) {
      if (!filter(id)) return;
      const s = new MagicString(code);
      const idx = code.indexOf("export default");
      s.update(
        idx,
        idx + 14,
        `(window.scratchAddons.addons["${addonId}"] = (window.scratchAddons.addons["${addonId}"] || {}))["${userscript}"] =`
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
