export default async function ({ addon, msg }) {
  const showMenu = addon.settings.get("showMenu");
  const player = addon.settings.get("alternativePlayer");
  const autoPlay = addon.settings.get("autoPlay");
  const enableTWAddons = addon.settings.get("enableTWAddons");
  const shareUsername = addon.settings.get("shareUsername");

  const enabledAddons = await addon.self.getEnabledAddons("editor");
  const username = await addon.auth.fetchUsername();

  const stageElement = document.querySelector(".stage");
  const projectId = window.Scratch.INIT_DATA.PROFILE.featuredProject.id;

  // Create and append elements

  const iframeElement = document.createElement("iframe");
  iframeElement.setAttribute("allowtransparency", "");
  iframeElement.setAttribute("width", "282");
  iframeElement.setAttribute("height", "210");
  iframeElement.setAttribute("frameborder", "0");
  iframeElement.setAttribute("allowfullscreen", "");
  iframeElement.setAttribute(
    "allow",
    "autoplay 'src'; camera 'src'; document-domain 'none'; fullscreen 'src'; gamepad 'src'; microphone 'src';"
  );
  iframeElement.setAttribute("scrolling", "no");

  const wrapperElement = document.createElement("div");
  wrapperElement.id = "lfp-embed";

  const changeFeaturedElement = document.createElement("div");
  changeFeaturedElement.id = "lfp-change-featured";
  changeFeaturedElement.textContent = msg("change-featured");
  changeFeaturedElement.addEventListener("click", () => {
    document.querySelector('#profile-box .player [data-control="edit"]').click();
  });

  wrapperElement.appendChild(iframeElement);
  if (document.querySelector('#profile-box .player [data-control="edit"]'))
    wrapperElement.appendChild(changeFeaturedElement);
  stageElement.prepend(wrapperElement);

  if (showMenu) wrapperElement.classList.add("lfp-show-menu");
  else wrapperElement.classList.add("lfp-hide-menu");

  // Functions for loading embeds

  const loadScratch = () => {
    wrapperElement.dataset.player = "scratch";
    if (!showMenu) iframeElement.setAttribute("height", "260");
    iframeElement.setAttribute("src", `https://scratch.mit.edu/projects/embed/${projectId}/?autostart=true`);

    // Auto-start Scratch players (sadly need to be done automatically)

    if (autoPlay)
      iframeElement.addEventListener(
        "load",
        function callback() {
          const observer = new MutationObserver(() => {
            if (iframeElement.contentDocument.querySelector("[class^='loader_fullscreen']") === null) {
              iframeElement.contentDocument.querySelector("[class^='green-flag_green-flag']").click();
              observer.disconnect();
            }
          });
          observer.observe(iframeElement.contentDocument.body, {
            childList: true,
            subtree: true,
          });
        },
        {
          once: true,
        }
      );
  };

  const loadTurboWarp = () => {
    const usp = new URLSearchParams();
    if (autoPlay) usp.set("autoplay", "");
    if (enableTWAddons) usp.set("addons", enabledAddons.join(","));
    if (shareUsername) usp.set("username", username);
    iframeElement.setAttribute("src", `https://turbowarp.org/${projectId}/embed?${usp}`);
    wrapperElement.dataset.player = "turbowarp";
    if (!showMenu) iframeElement.setAttribute("height", "260");
  };

  // Start loading the players

  if (player === "turbowarp") loadTurboWarp();
  else loadScratch();
  iframeElement.addEventListener("load", () => {
    if (iframeElement.contentDocument.querySelector(".not-available-outer") !== null) {
      // Project is unshared and cannot be accessed
      stageElement.removeChild(wrapperElement);
    }
  });
}
