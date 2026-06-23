# Вільмак (Wilmak) — UI Design Specification

Design reference for the **Witcher TRPG session manager**: a GM desktop app plus a player web client on local WiFi. Describes every screen, section, field, and interaction — **what** should exist, not exact layout or sizing. Visual treatment is left to the designer.

---

## 1. Product summary

| Aspect             | Description                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product name**   | Вільмак (Ukrainian) / Wilmak — Witcher-themed TRPG sheet helper                                                                                   |
| **Primary user**   | Game Master (GM) on desktop                                                                                                                       |
| **Secondary user** | Players on phones/laptops via browser                                                                                                             |
| **Core loop**      | GM starts local session → players join with nickname + code → GM creates/edits character sheets → players view their sheet read-only in real time |
| **Game system**    | The Witcher Pen & Paper RPG (core rulebook stats, skills, magic, bestiary)                                                                        |

### User roles

- **GM (desktop):** Full control of all characters, session hosting, player invites, kick players, edit any sheet.
- **Player (browser):** Login only; sees **one** character sheet, **read-only**, updated live when the GM saves.

---

## 2. Visual direction (semantic)

Suggested mood — designer may interpret freely:

- **Tone:** Dark fantasy, table-friendly, readable in dim light. Parchment/worn paper feeling without literal parchment texture required.
- **Accent:** Warm gold for titles, active states, important values.
- **Surfaces:** Layered panels/cards slightly lighter than page background.
- **Text:** High-contrast body text; muted secondary text for hints and labels.
- **Danger:** Distinct treatment for delete, kick, errors.
- **Typography:** Serif for display names and section titles; sans-serif for UI and tables; monospace for URLs and login codes.
- **Character stats:** Each attribute (INT, REF, DEX, etc.) may use a distinct color cue for quick scanning.

### UI building blocks

| Block                   | Purpose                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| **Page**                | Full-screen view with optional back navigation                        |
| **Card**                | Grouped content on home/setup flows                                   |
| **Panel**               | Bordered section with a titled header                                 |
| **Primary action**      | Main CTA (start session, create, copy link)                           |
| **Secondary action**    | Default bordered button                                               |
| **Ghost action**        | Low-emphasis (back, cancel)                                           |
| **Danger action**       | Delete, kick                                                          |
| **Modal**               | Focused overlay; dismiss via close control, backdrop click, or Escape |
| **Tab bar**             | Horizontal section switcher (player sheets only)                      |
| **List row / card row** | Repeated items (invites, characters, catalog entries)                 |
| **Counter**             | Current / max numeric control (e.g. HP)                               |
| **Table**               | Skills, weapons, armor, magic                                         |
| **Status pill**         | Online / offline on invite rows                                       |

---

## 3. Information architecture

```
DESKTOP (GM)
├── Main Screen              — choose session type
├── Local Session            — load config, start server, lobby
├── DM Console               — invites, character lists, connection info
└── Character Sheet          — full-screen edit view for one character

PLAYER WEB (browser, same WiFi)
├── Player Login             — nickname + code
├── Waiting for sheet        — logged in but no character yet
└── Player Sheet             — read-only character view
```

---

## 4. Desktop app — screens

### 4.1 Main Screen

**Purpose:** Entry point; choose how to run a session.

**Contains:**

| Element                   | Content / behavior                                                        |
| ------------------------- | ------------------------------------------------------------------------- |
| App title                 | «Вільмак — Гейммайстер»                                                   |
| Subtitle                  | «Оберіть тип сесії.»                                                      |
| Option A — Local session  | Title, short description (WiFi server), **Обрати** → Local Session screen |
| Option B — Remote session | Title, short description, **Скоро** button (disabled, future feature)     |

**Layout intent:** Two parallel choices; stack on small windows, side by side on wide.

---

### 4.2 Local Session Screen

**Purpose:** Load session file, start server, show how players connect, manage lobby before DM Console.

**Header:** Screen title + **← Назад** (stops server, returns to Main).

#### When server is not running

**Setup card:**

| Step  | Content                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------ |
| 1     | Instruction to load session config file + **Завантажити файл сесії…** (opens file picker)                          |
| 1b    | If loaded: show session name and player count                                                                      |
| 1c    | If nothing loaded: hint that a new session can be created after start                                              |
| 2     | Instruction to start server + **Підняти сесію** (disabled until config exists; shows loading label while starting) |
| Error | Shown if start fails                                                                                               |

#### When server is running

**Server active card:**

| Element             | Content                               |
| ------------------- | ------------------------------------- |
| Title               | «Сервер працює»                       |
| Hint                | Players use URL or QR on same network |
| Per network address | Readable URL + scannable QR code      |
| CTA                 | **Відкрити DM Console →**             |

**Invited players card:**

| Element | Content                                    |
| ------- | ------------------------------------------ |
| Title   | «Запрошені гравці» + count                 |
| Hint    | Nickname and code needed for browser login |
| List    | See **Player Invites List** (section 5.5)  |

**Lobby card:**

| Element               | Content                         |
| --------------------- | ------------------------------- |
| Title                 | «Зараз у лобі» + count          |
| Empty state           | Waiting message                 |
| Each connected player | Nickname + **Виключити** (kick) |

---

### 4.3 DM Console

**Purpose:** Hub for running the game — connection helpers, invites, all character sheets.

**Header:** **← Back** (to Local Session) + title **DM Console**.

#### Section: Player Connection

| Element       | Content                               |
| ------------- | ------------------------------------- |
| Section title | Player connection (same WiFi)         |
| Action        | **QR Code** — opens QR modal          |
| URL list      | Each join URL with **Copy**           |
| Empty / error | Warning when no network URL available |

#### Section: Player invites

| Element | Content                                     |
| ------- | ------------------------------------------- |
| Header  | «Player invites» + count + **+ Add invite** |
| Hint    | Explain nickname + code for login           |
| List    | Player Invites List                         |

#### Section: Player characters

| Element | Content                                                  |
| ------- | -------------------------------------------------------- |
| Header  | «Player characters» + count + **+ New Player** (primary) |
| Empty   | Loading or “no sheets yet” message                       |
| List    | Character card per player (see below)                    |

**Player character card:**

| Part             | Content                                        |
| ---------------- | ---------------------------------------------- |
| Name             | Tappable — opens sheet                         |
| Race, occupation | Secondary labels when set                      |
| Login info       | Nickname and 4-digit code for player login     |
| Actions          | **Open Sheet**, **Delete** (with confirmation) |

#### Section: Enemies & NPCs

| Element | Content                                    |
| ------- | ------------------------------------------ |
| Header  | «Enemies & NPCs» + count + **+ New Enemy** |
| Empty   | “No enemies yet”                           |
| List    | Character card per enemy (see below)       |

**Enemy character card:**

| Part              | Content                                        |
| ----------------- | ---------------------------------------------- |
| Name              | Tappable — opens sheet                         |
| Monster type      | For bestiary monsters (e.g. Necrophage, Beast) |
| Race / occupation | For humanoid NPCs only                         |
| Threat level      | When from bestiary (e.g. Easy / Simple)        |
| Actions           | **Open Sheet**, **Delete**                     |

---

### 4.4 Character Sheet (GM view)

**Purpose:** Full-screen editing for one character; changes save automatically.

**Chrome:**

| Element | Behavior                                    |
| ------- | ------------------------------------------- |
| Back    | **← DM Console**                            |
| Loading | Centered loading message until data arrives |

Sheet content depends on character type — see **Section 6**.

---

## 5. Modals & shared components

### 5.1 Create Character Modal

Opened from **+ New Player** or **+ New Enemy**.

**Chrome:** Title, close control, Cancel + Create actions.

#### New Player Character

| Field           | Required | Notes                                                          |
| --------------- | -------- | -------------------------------------------------------------- |
| Name            | yes      | Character display name                                         |
| Race            | no       | Human, Elf, Dwarf, Witcher                                     |
| Occupation      | no       | Filtered by race; 9 professions                                |
| Player nickname | yes      | Login identifier (lowercase, no spaces); creates invite if new |

#### New Enemy

**Mode switch:** **Bestiary** | **Custom NPC**

**Bestiary mode:**

| Field    | Required | Notes                                                                                                              |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| Creature | yes      | Dropdown grouped: Humanoid NPCs, Monsters, Beasts & Animals (~30 rulebook entries); optional threat shown in label |
| Name     | yes      | Pre-filled from selection, editable                                                                                |

**Custom NPC mode:**

| Field      | Required |
| ---------- | -------- |
| Name       | yes      |
| Race       | no       |
| Occupation | no       |

Creates a blank NPC without pre-filled stats.

---

### 5.2 Add Invite Modal

| Field     | Required | Notes                           |
| --------- | -------- | ------------------------------- |
| Nickname  | yes      | Login name                      |
| Info text | —        | Code is generated automatically |

Actions: Cancel, **Add invite**.

---

### 5.3 QR Connect Modal

| Element        | Content                                  |
| -------------- | ---------------------------------------- |
| Title          | Scan to join                             |
| Hint           | Same WiFi required                       |
| QR code        | Encodes primary join URL                 |
| URL            | Shown as text                            |
| **Copy link**  | Primary action                           |
| Alternate URLs | Listed if machine has multiple addresses |

---

### 5.4 Catalog Picker Modal

Opened when GM adds weapons, armor, or magic from rulebook catalogs on a player sheet.

| Element         | Content                                                    |
| --------------- | ---------------------------------------------------------- |
| Title           | Contextual (weapon, armor slot, magic category)            |
| Search          | Filter list                                                |
| Results         | Scrollable — item name, short stats, effect text for magic |
| Optional footer | Add blank custom row                                       |

Catalogs: weapons, armor, magic (signs, spells, invocations, hexes, rituals).

---

### 5.5 Player Invites List

Used on Local Session and DM Console.

**Each row:**

| Part     | Content              |
| -------- | -------------------- |
| Nickname | Player login name    |
| Status   | Online or offline    |
| Code     | 4-digit login code   |
| Copy     | Optional copy action |

**Empty:** Message that no invites exist yet.

---

## 6. Character Sheet — layouts

Three variants:

| Variant                      | When                                         | Tabs             | GM can edit              |
| ---------------------------- | -------------------------------------------- | ---------------- | ------------------------ |
| **A. Player / custom enemy** | Player character, or enemy not from bestiary | Yes              | GM yes; player read-only |
| **B. Bestiary stat block**   | Enemy from rulebook catalog                  | No — single page | GM yes                   |
| **C. Player web**            | Player’s own character in browser            | Yes              | Never (read-only)        |

### 6.1 Sheet header (all variants)

| Element          | GM                                                    | Player                                   |
| ---------------- | ----------------------------------------------------- | ---------------------------------------- |
| Back             | Returns to DM Console                                 | **Logout**                               |
| Character name   | Editable                                              | Display only                             |
| Identity line    | Race + occupation selectors, or monster type + threat | Race and occupation as text              |
| Player only      | Nickname field in header                              | —                                        |
| Read-only banner | Hidden for bestiary enemies                           | “View only — your DM updates this sheet” |

---

### 6.2 Variant A & C — Tabbed player sheet

**Tabs:** Stats · Combat · Inventory · Magic\* · Other

\*Magic only for Mage, Priest, Witcher.

#### Tab: Stats

**Vitals**

| Field           | Interaction                                         |
| --------------- | --------------------------------------------------- |
| HP              | Current / max counter                               |
| STA             | Current / max counter                               |
| Resolve         | Current / max counter                               |
| Wound threshold | Number                                              |
| Formula hint    | Optional muted explanation of how maxes are derived |

**Attributes & skills**

Nine attribute groups: INT, REF, DEX, BODY, SPD, EMP, CRA, WILL, LUCK.

Per attribute:

- Header: icon, short label, full name, attribute value
- Skill list: skill name · level · base (attribute + level)
- Some skills are “special” (marked distinctly) — cost double at character creation

**Luck & derived stats**

| Field                                           | Notes                              |
| ----------------------------------------------- | ---------------------------------- |
| Luck                                            | Visual pips for max; GM marks used |
| RUN, LEAP, STUN, REC                            | Movement and recovery              |
| Adrenaline, Improvement points, Training points | Progression tracking               |
| Punch, Kick                                     | Unarmed damage strings             |

#### Tab: Combat

**Weapons** — table with full rulebook columns:

Name, Type, WA, Damage, Reliability, Hand, Range, Effect, Concentration, Enhancements, Weight.

GM can add from weapon catalog or blank row.

**Bonus melee** — Punch and Kick values.

**Armor** — six body slots:

| Slot                                                  | Label |
| ----------------------------------------------------- | ----- |
| Head, Torso, Right arm, Left arm, Right leg, Left leg |       |

Per slot: piece name (from catalog or custom), stopping power, damage state, effects, weight.

Free-text armor notes below table.

#### Tab: Inventory

**Consumables** — quantity, name, effect, weight. Add/remove rows (GM only).

#### Tab: Magic (conditional)

Panels depend on occupation:

| Occupation | Magic sections              |
| ---------- | --------------------------- |
| Witcher    | Signs, Hexes                |
| Mage       | Spells, Hexes, Rituals      |
| Priest     | Invocations, Hexes, Rituals |

Per section: name, STA cost, defense, range, duration, effect. Add from magic catalog (GM only).

#### Tab: Other

| Panel                | Fields                          |
| -------------------- | ------------------------------- |
| Profession abilities | Name, stat, level, base         |
| Wounds               | Description, severity, duration |
| Status effects       | Description                     |

---

### 6.3 Variant B — Bestiary enemy (single page)

**No tabs.** One scrollable page optimized for DM combat reference. Rulebook stats pre-filled.

**Suggested information grouping** (designer chooses layout):

**Combat block**

| Field                | Notes               |
| -------------------- | ------------------- |
| HP, STA              | Counters            |
| RUN, LEAP, STUN, REC | Numeric             |
| VIGOR                | Shown when relevant |

**Creature info block**

| Field                                                   | Examples      |
| ------------------------------------------------------- | ------------- |
| Threat                                                  | Easy / Simple |
| Bounty                                                  | Crown value   |
| Natural armor                                           | SP value      |
| Height, weight, environment, intelligence, organization | Rulebook text |
| Encumbrance                                             | When listed   |

**Attributes** — all nine stats in compact form.

**Skills** — only skills with level &gt; 0: name, level, base.

**Attacks** — simplified: name, damage, effect, range, rate of fire.

**Vulnerabilities** — prose (oils, weaknesses).

**Abilities** — prose (special rules).

**Loot** — prose.

**Worn armor** — only for bestiary humanoid NPCs; six slots with catalog picker (GM).

**Combat notes** — wounds table and status effects table side by side for tracking during play.

**Not shown for monsters:** Resolve, wound threshold, luck, adrenaline, improvement points, inventory, magic, profession abilities, full weapon detail columns, empty skill rows.

---

## 7. Player web app

### 7.1 Player Login

**Purpose:** Authenticate with DM-provided credentials.

**Contains:**

| Element        | Content                         |
| -------------- | ------------------------------- |
| Brand mark     | Wolf motif (placeholder)        |
| Title          | Player Login                    |
| Hint (UA)      | Enter nickname and code from DM |
| Nickname field | Text input                      |
| Code field     | Short numeric code              |
| Error message  | On failed login                 |
| Submit         | Open my sheet / loading state   |

Success → Player Sheet.

### 7.2 Waiting for sheet

Shown when login works but GM has not linked a character to this nickname.

| Element         | Content                                       |
| --------------- | --------------------------------------------- |
| Title           | Logged in                                     |
| Message         | Ask DM to create sheet with matching nickname |
| **Check again** | Retry                                         |
| **Logout**      | Return to login                               |

### 7.3 Player Sheet

Same tabbed layout as **Variant A** (Section 6.2), always read-only. Back action = Logout. Updates live when GM edits.

Players only see player characters, not enemy sheets.

---

## 8. Data the UI represents

### Character

| Group               | What the user sees                                                                 |
| ------------------- | ---------------------------------------------------------------------------------- |
| Identity            | Name, player vs enemy, race, occupation, login nickname                            |
| Enemy extras        | Monster vs NPC, bestiary creature type, threat, bounty, natural armor, lore fields |
| Attributes          | Nine core stats                                                                    |
| Skills              | Per-skill level and computed base                                                  |
| Vitals              | HP, stamina, resolve, wound threshold                                              |
| Movement / recovery | Run, leap, stun, recovery                                                          |
| Luck                | Maximum and spent                                                                  |
| Weapons & armor     | Gear lists                                                                         |
| Consumables         | Ammo, potions, bombs, traps                                                        |
| Magic               | Spells/signs/etc. by category                                                      |
| Notes               | Wounds, status effects, profession abilities                                       |

### Session

| Entity           | What the user sees                     |
| ---------------- | -------------------------------------- |
| Session          | Name, port (internal), list of invites |
| Invite           | Nickname + 4-digit code                |
| Connected player | Nickname in lobby                      |

---

## 9. Reference data (dropdowns & catalogs)

**Races:** Human, Elf, Dwarf, Witcher.

**Occupations:** Bard, Craftsman, Criminal, Doctor, Mage, Man At Arms, Merchant, Priest, Witcher.

**Bestiary groups (enemy creation):** Humanoid NPCs (Bandits, Mages, Scoia'tael Archers), Monsters (Drowners, Ghouls, Griffins, …), Beasts & Animals (Wolf, Horse, Cat, …) — 30 entries total.

**Equipment & magic catalogs** back the “add from catalog” pickers on player sheets.

---

## 10. User flows

```
GM: Main → Local → load session → start server → DM Console

GM: DM Console → + New Player → fill form → character + invite created

GM: DM Console → + New Enemy → Bestiary → pick creature → stat block sheet

Player: scan QR or open URL → login → sheet (or waiting screen)

GM: open sheet → edit HP / wounds → saves → player view updates

GM: Local lobby → kick player
```

---

## 11. Language

Mixed Ukrainian and English in current copy:

| Area                             | Language                 |
| -------------------------------- | ------------------------ |
| Main, Local session              | Ukrainian                |
| DM Console, modals, enemy sheets | English                  |
| Player login                     | Ukrainian + some English |

Design may unify or localize later.

---

## 12. Layout & responsiveness (intent only)

| Context      | Intent                                                                                 |
| ------------ | -------------------------------------------------------------------------------------- |
| GM desktop   | Comfortable reading width; multi-column where it helps (sheet stats, enemy stat block) |
| Player phone | Single column; login centered; tabs scroll horizontally if needed                      |
| Modals       | Focused, scrollable content when lists are long                                        |
| Tables       | May scroll horizontally on narrow screens                                              |

No fixed measurements prescribed — designer decides spacing, type scale, and breakpoints.

---

## 13. States & feedback

| State            | Expected feedback                                                          |
| ---------------- | -------------------------------------------------------------------------- |
| Loading          | Clear loading message                                                      |
| Empty section    | Short placeholder explaining what goes there                               |
| Error            | Visible error text near the action that failed                             |
| Online / offline | Distinguishable on invite rows                                             |
| Delete / kick    | Confirmation before destructive action                                     |
| Read-only sheet  | No editable controls; values as text                                       |
| Disabled         | Visually distinct unavailable actions (coming soon, no server, submitting) |

---

## 14. Out of scope (future)

- Remote session (second main-screen option)
- Player view of enemy sheets
- Single app language
- Dice, initiative, chat
- Full character creation wizard (point-buy)
- Light theme

---

_Content-focused spec for UI/design generation. Describes structure and behavior, not implementation._
