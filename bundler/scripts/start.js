import server, { addonScriptWss } from "../hmr/severs.js";
import port from "../port.js";
import { watch } from "rollup";
import buildConfig from "../config.js";
import { hmrPlugin, addonTransformer } from "../hmr/rollup-plugins.js";
import chalk from "chalk";
import chokidar from "chokidar";

function createWatcher() {
  const config = buildConfig();
  config[0].plugins[0] = hmrPlugin(true);
  config[1].plugins[0] = addonTransformer();

  const watcher = watch(config).on("event", (e) => {
    if (e.code === "END") {
      const count = addonTransformer.addons_changed.length;
      while (addonTransformer.addons_changed.length > 0) {
        const changed = addonTransformer.addons_changed.shift();
        if (!changed.first) console.log(`${chalk.blueBright.bold("[Addon Updated]")} ${changed.addonId}`);
        addonScriptWss.clients.forEach((ws) => ws.send(changed.addonId));
      }
      console.log(chalk.greenBright(`Built ${chalk.white.bold(count)} addon userscripts.`));
    } else if (e.code === "ERROR") {
      console.error(`${chalk.redBright.bold("[Error]")} ${e.error.message}`);
    }
  });

  return watcher;
}

/**
 *
 * @param {import("rollup").RollupWatcher} watcher
 */
function handleWatcher(watcher) {
  const fsWatcher = chokidar.watch(["addons/addons.json", "addons/**/addon.json"]);
  fsWatcher.on("all", async () => {
    await fsWatcher.close();
    await watcher.close();
    handleWatcher(createWatcher());
  });
}

server.listen(port);
