import { importAddon } from "./import-addon.js";
import Addon from "../../addon-api/content-script/Addon.js";
import hmrEmitter from "../../bundler/hmr/runtime.js";

export default async function runAddonUserscripts({ addonId, scripts, enabledLate = false }) {
  let addonObj = new Addon({ id: addonId, enabledLate });
  addonObj.auth._update(scratchAddons.session);
  const run = async () => {
    for (const scriptInfo of scripts) {
      const { url: scriptPath, runAtComplete } = scriptInfo;
      const loadUserscript = async () => {
        await scratchAddons.l10n.loadByAddonId(addonId);
        const module = await importAddon(addonId, scriptPath);
        const msg = (key, placeholders) =>
          scratchAddons.l10n.get(key.startsWith("/") ? key.slice(1) : `${addonId}/${key}`, placeholders);
        msg.locale = scratchAddons.l10n.locale;
        scratchAddons.console.logForAddon(`${addonId} [page]`)(
          `Running script ${scriptPath}, runAtComplete: ${runAtComplete}, enabledLate: ${enabledLate}`
        );
        const localConsole = {
          log: scratchAddons.console.logForAddon(addonId),
          warn: scratchAddons.console.warnForAddon(addonId),
          error: scratchAddons.console.errorForAddon(addonId),
        };
        module({
          addon: addonObj,
          console: { ...console, ...localConsole },
          msg,
          safeMsg: (key, placeholders) =>
            scratchAddons.l10n.escaped(key.startsWith("/") ? key.slice(1) : `${addonId}/${key}`, placeholders),
        });
      };
      if (runAtComplete && document.readyState !== "complete") {
        window.addEventListener("load", () => loadUserscript(), { once: true });
      } else {
        await loadUserscript();
      }
    }
  };
  const update = () => {
    console.debug("addon updated", addonId);
    addonObj.self.updated = true;
    addonObj.self.dispatchEvent(new CustomEvent("disabled"));
    addonObj = new Addon({ id: addonId, enabledLate: true });
    addonObj.auth._update(scratchAddons.session);
    run();
  };
  hmrEmitter.addEventListener("addonUpdate", ({ detail: { addonId: updatedAddon } }) => {
    if (updatedAddon === addonId) update();
  });
  return await run();
}
