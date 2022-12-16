export default async function ({ addon, console }) {
  console.log("2: Enabled" + (addon.self.enabledLate ? " late" : ""));

  while (true) {
    try {
      await new Promise((resolve, reject) => {
        const disableListener = () => {
          if (addon.self.updated) console.log("2: Addon updated");
          else console.log("2: Addon disabled");
          reject();
        };
        addon.self.addEventListener("disabled", disableListener, { once: true });
        setTimeout(() => {
          resolve();
        }, 1000);
      });
      //console.log("2: Tick");
    } catch {
      break;
    }
  }
}
