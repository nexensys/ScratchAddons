import { WebSocketServer } from "ws";
import { createServer } from "http";
import { parse as parseURL } from "url";

export const backgroundWss = new WebSocketServer({ noServer: true });
export const addonScriptWss = new WebSocketServer({ noServer: true });
export const addonStyleWss = new WebSocketServer({ noServer: true });

const server = createServer((req, res) => {
  res.statusCode = 404;
});

const upgradeHandler = (server, req, socket, head) => {
  server.handleUpgrade(req, socket, head, (ws) => {
    server.emit("connection", socket, req);
  });
};

server.on("upgrade", (...a) => {
  const url = parseURL(a[0].url);

  switch (url.pathname) {
    case "/addons":
      return upgradeHandler(addonScriptWss, ...a);
    case "/styles":
      return upgradeHandler(addonStyleWss, ...a);
    case "/background":
      return upgradeHandler(backgroundWss, ...a);
  }
});

export default server;
