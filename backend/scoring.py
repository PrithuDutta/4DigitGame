"""Round scoring for the 3-player math puzzle game.

Each round, up to 3 players race to solve the same 4-digit puzzle. This module
is a pure function of already-resolved round results (who solved, how fast) —
it does not run a clock or decide when a round ends. Wherever solve_time comes
from (server-side timestamping of a correct submission) is a separate concern.
"""

from dataclasses import dataclass
from typing import Optional

ROUND_TIME_LIMIT = 90.0   # seconds
SOLVE_BONUS = 100.0       # flat points for solving
SPEED_BONUS_MAX = 50.0    # max speed points (instant solve)
RANK_BONUS = [30.0, 15.0, 5.0]  # 1st, 2nd, 3rd place among solvers


@dataclass(frozen=True)
class PlayerRoundResult:
    """One player's raw outcome for a round, as reported by the caller."""

    player_id: str
    solved: bool
    solve_time: Optional[float] = None  # seconds from round start; None unless solved


@dataclass(frozen=True)
class PlayerRoundScore:
    """A player's round_score, broken into its components for display/debugging."""

    player_id: str
    solve_bonus: float
    speed_bonus: float
    rank_bonus: float

    @property
    def round_score(self) -> float:
        return self.solve_bonus + self.speed_bonus + self.rank_bonus


def score_round(results: list[PlayerRoundResult]) -> list[PlayerRoundScore]:
    """Score one round for 1-3 players. Each player is scored independently.

    Ties in solve_time are broken by the order players appear in `results` —
    callers should pass results in a stable, deterministic order (e.g. join
    order) so that identical solve_times don't produce ambiguous ranking.
    """
    for r in results:
        if r.solved and r.solve_time is None:
            raise ValueError(f"player {r.player_id!r} is marked solved but has no solve_time")

    solvers_by_rank = sorted((r for r in results if r.solved), key=lambda r: r.solve_time)
    rank_bonus_by_player = {
        r.player_id: RANK_BONUS[i]
        for i, r in enumerate(solvers_by_rank)
        if i < len(RANK_BONUS)
    }

    scores = []
    for r in results:
        if r.solved:
            solve_bonus = SOLVE_BONUS
            speed_bonus = max(0.0, SPEED_BONUS_MAX * (1 - r.solve_time / ROUND_TIME_LIMIT))
            rank_bonus = rank_bonus_by_player.get(r.player_id, 0.0)
        else:
            solve_bonus = speed_bonus = rank_bonus = 0.0

        scores.append(PlayerRoundScore(
            player_id=r.player_id,
            solve_bonus=solve_bonus,
            speed_bonus=speed_bonus,
            rank_bonus=rank_bonus,
        ))

    return scores
