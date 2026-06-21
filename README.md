# Вільмак — менеджер сесій рольової гри (TypeScript)

Десктоп-застосунок гейммайстра (Electron + electron-vite + React, увесь код на
TypeScript), що локально піднімає сервер у вашій WiFi-мережі. Гравці підключаються
через браузер за нікнеймом і кодом. Архітектура закладена так, щоб той самий сервер
згодом працював і на віддаленому хості (варіант 2) без переписування.

## Структура

```
packages/
  shared/      @wilmak/shared — ЄДИНЕ джерело типів протоколу між процесами:
               повідомлення IPC main<->server, події Socket.io server<->гравець,
               форма window.api. Тільки типи, без рантайму.
apps/
  server/      Express + Socket.io (TS). Типізований сервер (дженерики Socket.io).
               Подвійний режим: forked (Electron) / standalone (VPS, env).
               esbuild бандлить src/index.ts -> dist/server.cjs.
  desktop/     Electron + electron-vite + React (TS):
               src/main      — головний процес (форкає сервер);
               src/preload   — місток IPC (єдиний привілейований канал GM);
               src/renderer  — React-UI гейммайстра.
  player-web/  React-клієнт гравця (TS). Віддається СЕРВЕРОМ з того ж origin.
sessions/      Приклад файлу сесії (нікнейми + коди).
```

## Типізований протокол (головна вигода)

`packages/shared/src/protocol.ts` описує контракти один раз. Socket.io підхоплює їх
дженериками (`Server<ClientToServerEvents, ServerToClientEvents, ..., SocketData>` і
`io<ServerToClientEvents, ClientToServerEvents>()`), а `window.api` типизується через
`src/renderer/src/global.d.ts`. Назви подій, payload'и й форма повідомлень перевіряються
на компіляції в усіх процесах.

## Ініціалізація

```bash
npm install
```

## Розробка

```bash
npm run dev        # build player-web -> build+watch server -> electron-vite dev (HMR)
npm run typecheck  # tsc --noEmit по всіх пакетах
```

У застосунку: Локальна сесія → «Завантажити файл сесії…» → `sessions/example-session.json`
→ «Підняти сесію». Зʼявиться LAN-адреса і QR. Гравець вводить, напр., `Mira` / `5678`.
Жива розробка плеєрського UI окремо: `npm run dev:player` (порт 5174, з проксі на сервер).

## Збірка інсталятора

```bash
npm run dist       # electron-vite build -> esbuild сервера -> build player-web -> electron-builder
```

Інсталятор зʼявиться в `dist/`. Цілі: Windows `nsis`, mac `dmg`/`zip`, Linux `AppImage`/`deb`.
Mac збирається лише на macOS; для Mac/Linux без заліза — GitHub Actions (matrix).

## Нотатки

- TypeScript перевіряє типи лише через `tsc` (`npm run typecheck`). esbuild/Vite
  типи НЕ перевіряють — зрізають. Ганяйте typecheck локально та в CI.
- **electronVersion** у `apps/desktop/package.json → build` має збігатися зі
  встановленою (`npm ls electron`); пін без `^` уникає помилки в workspaces.
- **winCodeSign / symlink на Windows** — Режим розробника або термінал від адміна.
- **Нативні модулі** (коли додасте `better-sqlite3`): `--external` для esbuild +
  `electron-rebuild` + `asarUnpack`.
