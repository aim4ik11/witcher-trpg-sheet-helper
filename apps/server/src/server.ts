import { createServer } from "node:http";
import path from "node:path";
import express from "express";
import { Server as SocketServer } from "socket.io";
import type { SessionConfig } from "@wilmak/shared";
import { state } from "./store";
import { lanUrls, notifyHost, pushCredentials, normalizeNickname } from "./utils";
import { normalizeCharacter } from "@wilmak/game-data";
import charactersRouter from "./routes/characters";
import playerRouter from "./routes/player";
import { registerSocketHandlers } from "./socket/handlers";

const forked = !!process.parentPort;

export function start(cfg: Partial<SessionConfig>): void {
  const { players: rawPlayers, characters: rawCharacters, ...rest } = cfg;
  const players = (rawPlayers ?? []).map((p) => ({
    ...p,
    nickname: normalizeNickname(p.nickname),
  }));
  state.config = { sessionName: "", port: 4317, playerWebDir: null, ...rest, players };

  state.characters.clear();
  state.combat = null;
  for (const char of rawCharacters ?? []) {
    if (char?.id && char.type && char.name) {
      state.characters.set(char.id, normalizeCharacter(char));
    }
  }

  const app = express();
  app.use(express.json());

  app.get("/api/host-info", (_req, res) => {
    res.json({ urls: lanUrls(state.config.port) });
  });
  app.use("/api/characters", charactersRouter);
  app.use("/api/player", playerRouter);

  if (state.config.playerWebDir) {
    const webDir = state.config.playerWebDir;
    app.use(express.static(webDir));
    // SPA fallback — reload on /sheet etc. must serve index.html, not 404.
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(webDir, "index.html"));
    });
  }

  state.httpServer = createServer(app);
  state.io = new SocketServer(state.httpServer, { cors: { origin: true } });

  registerSocketHandlers(state.io);

  state.httpServer.listen(state.config.port, () => {
    notifyHost({
      type: "ready",
      port: state.config.port,
      urls: lanUrls(state.config.port),
    });
    pushCredentials();
    if (!forked)
      console.log("[server] listening on", lanUrls(state.config.port).join(", "));
  });
  state.httpServer.on("error", (err: NodeJS.ErrnoException) => {
    const message =
      err.code === "EADDRINUSE"
        ? `Port ${state.config.port} is already in use`
        : err.message;
    notifyHost({ type: "error", message });
    if (!forked) console.error("[server]", message);
  });
}
