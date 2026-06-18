# Witcher TRPG Sheet Helper

A local DM helper for the Witcher Tabletop RPG. Run a host server on your laptop, share a link with players on their phones, and manage digital character sheets with real-time sync.

## Features

- **DM Console** — create and manage player characters, enemies, and NPCs
- **Player access** — players connect via nickname and edit their own sheet from a phone
- **Digital sheet** — attributes, skills (auto-calculated base), vitals with +/- counters, weapons, armor, consumables, spells, wounds, status effects
- **Real-time sync** — changes broadcast instantly via WebSockets (DM sees player updates live)
- **JSON storage** — no database; character data saved as JSON files in `data/`

## Quick Start

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Run in development (server + client)
npm run dev
```

- **DM**: open http://localhost:5173 → "DM Host"
- **Players on phones**: use the **Network** link in DM Console (e.g. `http://192.168.0.100:5173/play`) — not `localhost`

### Same WiFi (phones & tablets)

`localhost` only works on the computer running the server. Other devices need your machine's **local IP**.

**Option A — Development** (hot reload, two ports):

```bash
npm run dev
```

1. In the terminal, look for Vite's **Network** line, e.g. `http://192.168.0.100:5173/`
2. On phones, open `http://192.168.0.100:5173/play` (replace with your IP)
3. Or open DM Console — it lists copyable player links

**Option B — Game night (recommended, one port):**

```bash
npm run lan
```

1. Terminal prints `Network: http://192.168.x.x:3456`
2. DM opens that URL on the host laptop
3. Players open `http://192.168.x.x:3456/play`

**macOS firewall:** If phones can't connect, allow incoming connections for Node when prompted, or System Settings → Network → Firewall → allow Node.

For production (single port, no Vite dev server):

```bash
npm run build
npm start
# DM + Players: http://localhost:3456
```

## Player Setup

1. DM creates a player character and sets a **nickname** (e.g. `geralt`)
2. DM shares the player URL from the console
3. Player opens the link on their phone, enters nickname, and gets their sheet

A sample character "Geralt" (nickname: `geralt`) is created on first run for testing.

## Project Structure

```
server/           Express + Socket.io backend
  characterSchema.js   Character data model & formulas
  storage.js           JSON file read/write
  index.js             API routes & WebSocket handlers
client/           Vite + React frontend
data/              Character JSON files (gitignored, created at runtime)
```

## Vitals Formulas

| Stat    | Max Formula          |
|---------|----------------------|
| HP      | (BODY + WILL) / 2 × 5 |
| STA     | (BODY + WILL) / 2 × 5 |
| Resolve | (INT + WILL) / 2 × 5  |

Skill **Base** = Attribute value + Skill level (calculated automatically).

## Tech Stack

- Node.js + Express
- Socket.io (real-time)
- React + Vite
- JSON file storage
