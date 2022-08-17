import { UserscriptUtilities } from "../addon-api/content-script/typedef.js";
import { PopupUtilities } from "../addon-api/popup/typedef.js";

declare global {
  export module ScratchAddons {
    export type UserscriptAddonAPI = UserscriptUtilities;
    export type PopupAddonAPI = PopupUtilities;
    export type UserscriptAddonScript = (api: ScratchAddons.UserscriptAddonAPI) => Promise<void>;
    export type PopupAddonScript = (api: ScratchAddons.PopupAddonAPI) => Promise<void>;
  }
}
