import fs from "fs";
import { createServer } from "http";
import { parse as parseURL } from "url";
import process from "process";

import port from "../port.js";
import { backgroundWss } from "../hmr/severs.js";

const environment = process.argv[2];

if (!["chrome", "firefox", "edge"].includes(environment.toLowerCase())) {
  console.error("Invalid environment. Supported environments are: Chrome, Firefox, Edge");
  process.exit(1);
}

const server = createServer((re, res) => {});

server.on("upgrade", (req, socket, head) => {
  const url = parseURL(req.url);

  switch (url.pathname) {
    case "/background":
  }
});
