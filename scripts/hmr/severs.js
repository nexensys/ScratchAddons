import { WebSocketServer } from "ws";

export const backgroundWss = new WebSocketServer({ noServer: true });
