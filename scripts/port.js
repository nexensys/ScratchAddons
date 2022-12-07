import fs from "fs";

const DEFAULT_PORT = 3000;

let port = DEFAULT_PORT;

if (fs.existsSync("PORT")) {
  port = parseInt(fs.readFileSync("PORT", "utf-8"), 10);
}

export default port;
