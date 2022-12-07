import { Buffer } from "buffer";

export default function hash(addonId, scriptPath) {
  return Buffer.from(`${addonId};${scriptPath}`);
}
