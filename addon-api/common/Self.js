import Listenable from "./Listenable.js";

/**
 * Represents information about the addon.
 * @extends Listenable
 * @property {string} id the addon's ID.
 * @property {string} browser the browser.
 * @property {boolean} disabled whether the addon is disabled or not.
 * @property {boolean} updated whether the addon has been changed and needs to stop or not.
 */
export default class Self extends Listenable {
  constructor(addonObj, info) {
    super();
    this._addonId = info.id; // In order to receive fireEvent messages from background
    this.id = info.id;
    this._addonObj = addonObj;
    // catches both Chrome and Chromium
    this.browser = /Chrom/.test(navigator.userAgent) ? "chrome" : "firefox";
    this.disabled = false;
    this.updated = false;
    this.addEventListener("disabled", () => (this.disabled = true));
    this.addEventListener("reenabled", () => (this.disabled = false));
  }

  /**
   * path to the addon's directory.
   * @type {string}
   */
  get dir() {
    return `${this._addonObj._path}addons/${this.id}`;
  }

  /**
   * path to libraries directory.
   * @type {string}
   */
  get lib() {
    return `${this._addonObj._path}libraries`;
  }

  /**
   * @private
   */
  get _eventTargetKey() {
    return "self";
  }

  /**
   * Gets a list of addon IDs enabled, optionally filtered using tags.
   * @param {string=} tag - the tag for filtering.
   * @returns {Promise<string[]>} enabled addons' IDs
   */
  getEnabledAddons(tag) {
    return scratchAddons.methods.getEnabledAddons(tag);
  }
}
