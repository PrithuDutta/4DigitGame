# 4 Digit Reaction Game

A local multiplayer reaction game. A random 4-digit number appears on screen; each
player has their own key. Pressing your key is the puzzle's "solve" action; the
score you get for pressing depends on how fast you did it and where you ranked
against the other players that round.

There are two implementations living side by side in this repo, and **they now
use different scoring systems** (see below):

- **`src/`** — the original desktop app (Python + Tkinter). Single process, no
  network, run it and play immediately. Still uses the original simple scoring.
- **`backend/` + `frontend/`** — a web version of the same round mechanic: a Flask
  REST API holding the game state, and a Next.js UI that drives it. Uses the newer
  per-player solve/speed/rank scoring described below.

The web version started as a faithful port of the desktop app's `App` class, and
the two still share the same screens, phases, and input bindings — only the
scoring formula has diverged between them.

## Controls

Players pick **2 Player** or **3 Player** mode, then enter their names. Each player
is permanently bound to one input for the rest of the game:

| Player | Input |
|---|---|
| Player 1 | `ENTER` |
| Player 2 | `SHIFT` |
| Player 3 (3-player mode only) | mouse click (anywhere that isn't a button) |

Each round, a random 4-digit number is shown and the clock starts immediately
(`SPACE` re-rolls the number, but only before anyone has pressed their key yet —
it doesn't reset or pause the clock). Pressing your key is treated as "solving"
the round — the round ends once every player has either pressed or the clock runs
out, and then the score screen shows what everyone earned before the next round
starts.

### Desktop app scoring (`src/`, unchanged)

15-second rounds. No individual points for pressing — instead:

- **2 Player:** if exactly one of the two players pressed, they score 1 point.
  If both pressed, or neither pressed, the round is null (no one scores).
- **3 Player:** if exactly two of the three players pressed, both of those two
  score 1 point. Any other count (0, 1, or 3 presses) is a null round.

### Web app scoring (`backend/` + `frontend/`)

90-second rounds (`ROUND_TIME_LIMIT` in `backend/scoring.py`). Every player is
scored independently — nobody's points come out of anyone else's pool, and there's
no "null round" that wipes everyone out. For each player:

```
round_score = solve_bonus + speed_bonus + rank_bonus
```

| Component | Rule |
|---|---|
| `solve_bonus` | `SOLVE_BONUS` (100) flat, if you pressed at all this round. 0 if you didn't. |
| `speed_bonus` | `SPEED_BONUS_MAX * (1 - solve_time / ROUND_TIME_LIMIT)`, floored at 0, where `solve_time` is seconds elapsed since the round started (the puzzle was revealed) to your press — not since anyone else's press. Pressing right as the round starts earns the full 50; pressing right at the buzzer earns ~0. |
| `rank_bonus` | `RANK_BONUS = [30, 15, 5]` handed out only to the players who pressed, ordered by how fast they were (fastest first). A player who didn't press gets no rank slot. |

Not pressing (whether you'd call it "giving up" or "timing out" — there's no
distinction) scores 0 for the round; it's still one of the game's rounds, it just
contributes nothing.

Both implementations show a ready-up step on the score screen: each player
re-presses their input to signal they're ready, and once everyone has, the next
round starts automatically with a new number.

### Games, in the web app

Entering names doesn't just start a round, it starts a **game**: scores reset to
0 and you play exactly `ROUNDS_PER_GAME` (10) rounds. The score screen after each
round shows a full breakdown table (`solve`/`speed`/`rank`/`round`/running
`total` per player), not just a one-line message. After the 10th round's ready-up,
instead of starting an 11th round the game ends and a **podium** screen shows
final standings (1st/2nd/3rd by total score) plus a round-by-round recap table,
with a "New Game" button that goes back to mode select. The desktop app has no
such concept — it's still an unbounded round-after-round loop with a persistent
scoreboard.

An **Admin Panel** (password-gated, see `ADMIN_PASSWORD` in the config files) is
reachable from the score screen and lets you manually overwrite the scoreboard.
Both the name-entry and in-round screens also have an **Exit** button that abandons
the current game and returns to mode select.

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
│   ├── game_state.py         # GameState: round/score state machine (calls scoring.py)
│   ├── scoring.py            # Pure per-player round scoring (solve/speed/rank bonuses)
│   ├── config.py             # Colors + ADMIN_PASSWORD (round timing lives in scoring.py)
│   └── requirements.txt
│
└── frontend/                # Next.js UI (web version's screens)
    ├── app/                   # Root layout + page (renders <GameApp />)
    ├── components/
    │   ├── GameApp.tsx         # Orchestrator: polls state, owns keyboard/mouse bindings
    │   ├── ModeScreen.tsx
    │   ├── NameScreen.tsx
    │   ├── RoundScreen.tsx
    │   ├── ScoreScreen.tsx      # includes the per-round solve/speed/rank breakdown table
    │   ├── Podium.tsx           # final standings + round-by-round recap, shown after round 10
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
five phases:

`mode_select → name_entry → round → score → (round → score) × 10 → podium`

`confirm_names()` is what actually starts a game: it resets scores to 0 and
`round_number` to 1. `score_ready()` is what decides, once everyone's readied up,
whether to start `round_number + 1` or — if that was round 10 — flip to `podium`
instead.

Every mutating endpoint returns the full current state as JSON, so the frontend
never has to guess what changed — it just replaces its local copy with the
response. A `threading.Lock` in `app.py` serializes state mutations.

| Endpoint | Effect |
|---|---|
| `GET /api/state` | Current game state |
| `GET /api/config` | Round time + color palette |
| `POST /api/mode` | Pick `2p`/`3p`, moves to `name_entry` |
| `POST /api/names` | Set player names, resets scores and round count, starts round 1 |
| `POST /api/round/new-number` | SPACE — reroll the number (only before anyone's pressed) |
| `POST /api/round/press` | Register a key/click for `enter`/`shift`/`mouse`, timestamped server-side |
| `POST /api/round/timeout` | Countdown hit 0 — score the round via `scoring.score_round()` from whoever pressed and when |
| `POST /api/score/ready` | Mark a player ready; once everyone is, starts the next round or (after round 10) moves to `podium` |
| `POST /api/mode-select` | "Change Mode"/Exit/"New Game" — back to mode select |
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

**Scoring** (`backend/scoring.py`). `score_round()` is a pure function — it takes
a list of `PlayerRoundResult(player_id, solved, solve_time)` and returns each
player's `PlayerRoundScore` (with the `solve_bonus`/`speed_bonus`/`rank_bonus`
breakdown, plus a `round_score` total). It doesn't run a clock or decide when a
round ends; `game_state.py` is what turns "player pressed `enter` at time T" into
a `solve_time` (elapsed seconds since the round started) and feeds it in. All the
tunable numbers (`ROUND_TIME_LIMIT`, `SOLVE_BONUS`, `SPEED_BONUS_MAX`,
`RANK_BONUS`) live as constants at the top of that file — change the game's feel
by editing those four values. Ties in `solve_time` are broken by input order, so
`game_state.py` always passes players in the same `p1, p2, p3` order.

`GameState._finish_round()` builds one `PlayerRoundResult` per active player from
`self.clicks` (did they press?) and `self.press_times` (when?), calls
`score_round()`, adds each player's `round_score` onto their running total, and
stores the full breakdown (now including `solve_time` itself, for display) in
`last_round_scores`. It also appends that breakdown to `round_history`, a list
that accumulates for the whole game and gets wiped on the next `confirm_names()`
— it's what `Podium.tsx` renders as the round-by-round recap table. Both
`last_round_scores` and `round_history` are included in every `/api/state`
response, along with `standings` (`p1`/`p2`/`p3` sorted by total score, ties
broken by player order) for the podium's 1st/2nd/3rd placement.

## Notes

- The web backend holds one global game session in memory — it resets on restart
  and isn't meant for multiple concurrent games.
- Colors and `ADMIN_PASSWORD` are duplicated across `src/core/config.py` and
  `backend/config.py` (there's no shared package between the Python desktop app
  and the Python backend) — keep them in sync if you change one. Round timing is
  *not* duplicated this way: the desktop app's 15s rounds live in
  `src/core/config.py`, while the web app's 90s rounds live in
  `backend/scoring.py` as `ROUND_TIME_LIMIT` — the two are intentionally
  different now that their scoring models differ.
- "Solving" in the web app currently just means pressing your key — there's no
  real puzzle-submission flow yet (no target number, no digit-arithmetic
  validation). `solve_time` is measured from when the round actually started
  (the puzzle was revealed) to your press, which is an interim stand-in until an
  actual puzzle/answer-submission mechanic exists.
- Scores only ever persist for the current 10-round game. Admin-edited scores,
  like round scores, get wiped the moment the next game's `confirm_names()` runs.
