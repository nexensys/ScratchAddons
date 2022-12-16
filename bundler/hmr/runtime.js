class AddonUpdateEvent extends CustomEvent {
  constructor(addonId) {
    super("addonUpdate", {
      detail: {
        addonId,
      },
    });
  }
}

class HMRTarget extends EventTarget {
  updateAddon(addonId) {
    this.dispatchEvent(new AddonUpdateEvent(addonId));
  }
}

const hmrEmitter = new HMRTarget();

if (import.meta.saHmrPort) {
  const ws = new WebSocket(`ws://localhost:${import.meta.saHmrPort}/addons`);
  ws.addEventListener("message", (m) => {
    const { event, data } = JSON.parse(m.data);
    if (event === "addonUpdate") hmrEmitter.updateAddon(data);
  });
  ws.addEventListener("error", () => {
    scratchAddons.console.warn("Unable to connect to addon development server.");
  });
}

export default hmrEmitter;
