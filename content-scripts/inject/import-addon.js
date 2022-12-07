export function importAddon(addonId, scriptPath) {
  const scriptUrl = `${new URL(import.meta.url).origin}/build/addons/${addonId}/${scriptPath}`;
  const elem = document.createElement("script");
  elem.src = scriptUrl;
  elem.defer = true;
  return new Promise((resolve, reject) => {
    elem.addEventListener("load", () => {
      elem.remove();
      resolve(window.scratchAddons.addons[addonId][scriptPath]);
    });
    elem.addEventListener("error", reject);
    (document.body || document.documentElement).appendChild(elem);
  });
}
