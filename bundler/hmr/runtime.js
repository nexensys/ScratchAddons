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
    hmrEmitter.updateAddon(m.data);
  });
}

export default hmrEmitter;
