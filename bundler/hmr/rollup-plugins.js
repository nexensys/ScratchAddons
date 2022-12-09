import MagicString from "magic-string";

import port from "../port.js";

export function hmrPlugin(dev) {
  return {
    name: "sa-dev-hmr",
    resolveImportMeta(property, { moduleId }) {
      switch (property) {
        case "saHmrPort":
          return dev ? `${port}` : null;
        default:
          return null;
      }
    },
  };
}

addonTransformer.addons_changed = [];
addonTransformer.addons_cached = {};

export function addonTransformer() {
  return {
    name: `sa-addon-transformer`,
    transform(code, id) {
      if (!this.getModuleInfo(id)?.isEntry) return;
      const [, addonId, userscriptPath] = id.match(/addons[\/\\]+([^\/\\]*)[\/\\]+(.*)$/);
      if (!(addonId in addonTransformer.addons_cached)) addonTransformer.addons_cached[addonId] = {};
      const userscript = userscriptPath.replace(/[\/\\]+/g, "/"); // Normalize
      if (code !== addonTransformer.addons_cached[addonId][userscript])
        addonTransformer.addons_changed.push({ addonId, first: !addonTransformer.addons_cached[addonId][userscript] });
      addonTransformer.addons_cached[addonId][userscript] = code;
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
