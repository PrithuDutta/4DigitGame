# 4 Digit Reaction Game

A local multiplayer reaction game. A random 4-digit number appears on screen; each
player has their own key. On each round, only some subset of players are "supposed"
to press their key — figuring out whether you should press is the game. Points are
scored based on how many players pressed.

There are two implementations of the same game living side by side in this repo:

- **`src/`** — the original desktop app (Python + Tkinter). Single process, no
  network, run it and play immediately.
- **`backend/` + `frontend/`** — a web version of the same game: a Flask REST API
  holding the game state, and a Next.js UI that drives it. Built so the game can be
  played in a browser instead of a native window.

Both implementations share the same rules and the same round/score state machine —
the web version is a faithful port of the desktop app's `App` class logic, not a
from-scratch redesign.

## Game rules

Players pick **2 Player** or **3 Player** mode, then enter their names. Each player
is permanently bound to one input for the rest of the game:

| Player | Input |
|---|---|
| Player 1 | `ENTER` |
| Player 2 | `SHIFT` |
| Player 3 (3-player mode only) | mouse click (anywhere that isn't a button) |

Each round:

1. A random 4-digit number is shown. Pressing `SPACE` re-rolls it, but only before
   anyone has pressed their key yet.
2. The first key/click press starts a 15-second countdown (`ROUND_TIME`).
3. The round ends when either the countdown hits 0, or every input needed to
   resolve the round has been pressed.
4. Scoring:
   - **2 Player:** if exactly one of the two players pressed, they score a point.
     If both pressed, or neither pressed, the round is null.
   - **3 Player:** if exactly two of the three players pressed, both of those two
     score a point. Any other count (0, 1, or 3 presses) is a null round.
5. On the score screen, each player re-presses their input to signal they're ready,
   and once everyone is ready the next round starts automatically with a new number.

An **Admin Panel** (password-gated, see `ADMIN_PASSWORD` in the config files) is
reachable from the score screen and lets you manually overwrite the scoreboard.

## Project structure

```
4DigitGame/
├── src/                    # Desktop app (Tkinter)
│   ├── main.py              # Entry point
│   ├── core/
│   │   ├── config.py         # Colors, ROUND_TIME, ADMIN_PASSWORD
│   │   └── utils.py          # generate_4digit_number()
│   └── ui/
│       ├── app.py            # App: owns all game state + the round/score state machine
│       ├── screens/          # ModeScreen, NameScreen, RoundScreen, ScoreScreen
│       └── dialogs/admin.py  # AdminDialog (password) + ScoreEditorDialog
│
├── backend/                # Flask REST API (web version's game state)
│   ├── app.py                # Routes — thin wrappers around GameState
│   ├── game_state.py         # GameState: the same state machine as src/ui/app.py
│   ├── config.py             # Same constants as src/core/config.py
│   └── requirements.txt
│
└── frontend/                # Next.js UI (web version's screens)
    ├── app/                   # Root layout + page (renders <GameApp />)
    ├── components/
    │   ├── GameApp.tsx         # Orchestrator: polls state, owns keyboard/mouse bindings
    │   ├── ModeScreen.tsx
    │   ├── NameScreen.tsx
    │   ├── RoundScreen.tsx
    │   ├── ScoreScreen.tsx
    │   └── AdminDialog.tsx
    └── lib/api.ts             # Typed fetch wrappers for every backend endpoint
```

## Running the desktop app

```bash
cd 4DigitGame
python src/main.py
```

No dependencies beyond Python's built-in `tkinter`.

## Running the web app

The backend and frontend are two separate processes; run both.

**Backend** (from `4DigitGame/backend/`):

```bash
python -m venv venv
./venv/Scripts/pip install -r requirements.txt   # (Linux/macOS: venv/bin/pip)
./venv/Scripts/python app.py                     # serves http://127.0.0.1:5000
```

**Frontend** (from `4DigitGame/frontend/`):

```bash
npm install
npm run dev                                      # serves http://localhost:3000
```

`frontend/.env.local` points the UI at the backend (`NEXT_PUBLIC_API_BASE`,
defaults to `http://127.0.0.1:5000`) — update it if you run the backend elsewhere.

## How the web version works

**Backend state machine** (`backend/game_state.py`). One in-memory `GameState`
object (module-level, no database) represents a single shared game session with
four phases:

`mode_select → name_entry → round → score → (round → score → ...)`

Every mutating endpoint returns the full current state as JSON, so the frontend
never has to guess what changed — it just replaces its local copy with the
response. A `threading.Lock` in `app.py` serializes state mutations.

| Endpoint | Effect |
|---|---|
| `GET /api/state` | Current game state |
| `GET /api/config` | Round time + color palette |
| `POST /api/mode` | Pick `2p`/`3p`, moves to `name_entry` |
| `POST /api/names` | Set player names, moves to `round` (generates first number) |
| `POST /api/round/new-number` | SPACE — reroll the number (only pre-press) |
| `POST /api/round/press` | Register a key/click for `enter`/`shift`/`mouse` |
| `POST /api/round/timeout` | Countdown hit 0 — resolve the round with whatever was pressed |
| `POST /api/score/ready` | Mark a player ready on the score screen |
| `POST /api/mode-select` | "Change Mode" — back to mode select (scores persist) |
| `POST /api/admin/login` | Check the admin password |
| `POST /api/admin/scores` | Overwrite scores directly |

**Frontend** (`frontend/components/GameApp.tsx`). A single client component holds
the current `GameStateDTO` and renders one of the four screen components based on
`state.phase`. It attaches one global `keydown`/`click` listener (mirroring the
Tkinter app's root-level key bindings) that routes `ENTER`/`SHIFT`/`SPACE`/click to
the right API call depending on the current phase — pressing `ENTER` calls
`round/press` mid-round but `score/ready` on the score screen, exactly like
`enter_pressed()` does in `src/ui/app.py`. The countdown timer is computed
client-side from a `deadline_ts` timestamp the backend hands back, and the frontend
calls `round/timeout` once it elapses — the backend never runs its own timer.

The `AdminDialog` modal ignores the global key bindings while open (checked via a
ref) so typing a password doesn't also register as a player's key press — the
same isolation the desktop app gets for free from Tkinter's modal `grab_set()`.

## Notes

- The web backend holds one global game session in memory — it resets on restart
  and isn't meant for multiple concurrent games.
- Colors, `ROUND_TIME`, and `ADMIN_PASSWORD` are duplicated across
  `src/core/config.py` and `backend/config.py` (there's no shared package between
  the Python desktop app and the Python backend) — keep them in sync if you change
  one.
