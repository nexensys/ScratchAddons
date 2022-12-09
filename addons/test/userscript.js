export default async function ({ addon, console }) {
  console.log("Enabled" + (addon.self.enabledLate ? " late" : ""));

  while (true) {
    try {
      await new Promise((resolve, reject) => {
        const disableListener = () => {
          if (addon.self.updated) console.log("Addon updated");
          else console.log("Addon disabled");
          reject();
        };
        addon.self.addEventListener("disabled", disableListener, { once: true });
        setTimeout(() => {
          resolve();
        }, 1000);
      });
      //console.log("Tick");
    } catch {
      break;
    }
  }
}
