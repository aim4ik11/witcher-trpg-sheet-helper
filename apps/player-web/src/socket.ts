import { io, type Socket } from "socket.io-client";
import type { JoinAck, PlayerCredential, ResumeAck } from "@wilmak/shared";

let socket: Socket | null = null;

export function getPlayerSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/socket.io",
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function disconnectPlayerSocket(): void {
  socket?.disconnect();
  socket = null;
}

function emitWithAck<T>(event: string, payload: unknown): Promise<T> {
  const s = getPlayerSocket();
  s.connect();

  return new Promise((resolve, reject) => {
    s.timeout(10_000).emit(event, payload, (err: Error | null, ack: T) => {
      if (err) reject(new Error("Server did not respond"));
      else resolve(ack);
    });
  });
}

export function joinSession(cred: PlayerCredential): Promise<JoinAck> {
  return emitWithAck<JoinAck>("join", cred);
}

export function resumeSession(token: string): Promise<ResumeAck> {
  return emitWithAck<ResumeAck>("resume", { token });
}

/** Re-join lobby after sleep, reconnect, or tab restore (mobile). */
export function watchSessionResume(
  token: string,
  onResumed: () => void,
  onInvalid: () => void,
): () => void {
  const s = getPlayerSocket();

  const resume = () => {
    void resumeSession(token)
      .then((ack) => {
        if (ack.ok) onResumed();
        else onInvalid();
      })
      .catch(() => undefined);
  };

  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    if (!s.connected) s.connect();
    resume();
  };

  s.on("connect", resume);
  s.io.on("reconnect", resume);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pageshow", onVisible);

  if (s.connected) resume();

  return () => {
    s.off("connect", resume);
    s.io.off("reconnect", resume);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("pageshow", onVisible);
  };
}
