import "../../libraries/thirdparty/cs/tinycolor-min.js";
import paintEditorHandler from "./paint-editor.js";

export default async (api) => {
  const { addon } = api;
  paintEditorHandler(api);
};
