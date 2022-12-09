export function importAddon(addonId, scriptPath) {
  const scriptUrl = `${new URL(import.meta.url).origin}/build/addons/${addonId}/${scriptPath}?t=${Date.now()}`;
  const elem = Object.assign(document.createElement("script"), {
    src: scriptUrl,
    defer: true,
    type: "module",
  });
  return new Promise((resolve, reject) => {
    elem.addEventListener("load", () => {
      elem.remove();
      resolve(window.scratchAddons.addons[addonId][scriptPath]);
    });
    elem.addEventListener("error", reject);
    (document.body || document.documentElement).appendChild(elem);
  });
}
