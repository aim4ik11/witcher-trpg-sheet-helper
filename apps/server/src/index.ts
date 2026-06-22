// Standalone server module (dual-mode):
//   LOCAL  — forked by Electron via utilityProcess (process.parentPort exists);
//   REMOTE — `node dist/server.cjs` / `tsx src/index.ts` on a VPS (env config).

import fs from 'node:fs';
import type { SessionConfig, HostToServer } from '@wilmak/shared';
import { start } from './server';
import { handleGmMessage } from './ipc/handlers';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Process {
      parentPort?: {
        postMessage(message: unknown): void;
        on(event: 'message', listener: (e: { data: HostToServer }) => void): void;
      };
    }
  }
}

if (process.parentPort) {
  process.parentPort.on('message', (e) => handleGmMessage(e.data));
} else {
  const sessionFile = process.env.SESSION_FILE;
  const fileCfg: Partial<SessionConfig> = sessionFile
    ? (JSON.parse(fs.readFileSync(sessionFile, 'utf-8')) as Partial<SessionConfig>)
    : {};
  start({
    sessionName:  fileCfg.sessionName ?? '',
    port:         Number(process.env.PORT) || fileCfg.port || 4317,
    players:      fileCfg.players ?? [],
    playerWebDir: process.env.PLAYER_WEB_DIR ?? null,
  });
}
