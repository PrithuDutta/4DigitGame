"""Server-side port of frontend/lib/sandboxMath.ts.

This is the authoritative version: the multiplayer tile-solving mode trusts
nothing the client claims about intermediate or final values. Every commit a
player makes gets recomputed here from the player's actual tile state, so a
modified client can't fabricate an instant solve.
"""

import math
from collections import deque

EPSILON = 1e-9
INTEGER_TOLERANCE = 1e-6


def is_close_to_integer(n):
    return abs(n - round(n)) < INTEGER_TOLERANCE


def is_within_tolerance(value, target):
    return abs(value - target) < INTEGER_TOLERANCE


class OpError(Exception):
    """Raised for any illegal operation — message is safe to surface to the client."""


def _finite(value):
    if not math.isfinite(value):
        raise OpError("That operation is undefined here.")
    return value


def _safe_pow(base, exponent):
    try:
        return math.pow(base, exponent)
    except (ValueError, OverflowError):
        # Python's math.pow raises for domain errors JS's Math.pow would
        # instead silently turn into NaN/Infinity — both end up rejected the
        # same way here, just via a different code path.
        raise OpError("That operation is undefined here.")


def apply_binary(kind, a, b):
    """a, b are the operands in fill order (a = first tile tapped, b = second)."""
    if kind == "+":
        return _finite(a + b)
    if kind == "-":
        return _finite(a - b)
    if kind == "*":
        return _finite(a * b)
    if kind == "/":
        if abs(b) < EPSILON:
            raise OpError("Cannot divide by zero.")
        return _finite(a / b)
    if kind == "^":
        if abs(a) < EPSILON and abs(b) < EPSILON:
            raise OpError("0^0 is undefined.")
        if a < 0 and not is_close_to_integer(b):
            raise OpError("Cannot raise a negative number to a non-integer power.")
        return _finite(_safe_pow(a, b))
    if kind == "root":
        # a = degree, b = radicand -> the a-th root of b, i.e. b^(1/a).
        if abs(a) < EPSILON:
            raise OpError("Root degree cannot be 0.")
        if b < 0:
            if not is_close_to_integer(a):
                raise OpError("Cannot take that root of a negative number.")
            degree = round(a)
            if degree % 2 == 0:
                raise OpError("Cannot take an even root of a negative number.")
            return _finite(-_safe_pow(-b, 1 / degree))
        return _finite(_safe_pow(b, 1 / a))
    raise OpError(f"Unknown operator: {kind}")


def apply_unary(kind, a):
    if kind == "sqrt":
        if a < 0:
            raise OpError("Cannot take the square root of a negative number.")
        return _finite(math.sqrt(a))
    if kind == "!":
        if a < 0 or not is_close_to_integer(a):
            raise OpError("Factorial requires a non-negative whole number.")
        n = round(a)
        if n > 170:
            raise OpError("That factorial is too large.")
        result = 1
        for i in range(2, n + 1):
            result *= i
        return _finite(float(result))
    raise OpError(f"Unknown operator: {kind}")


def format_value(value):
    if value == int(value):
        return str(int(value))
    rounded = round(value * 1e6) / 1e6
    if rounded == int(rounded):
        return str(int(rounded))
    return f"{rounded:.4f}".rstrip("0").rstrip(".")


BINARY_SYMBOLS = {"+": "+", "-": "−", "*": "×", "/": "÷", "^": "^", "root": "√"}


def binary_symbol(kind):
    return BINARY_SYMBOLS[kind]


def format_binary_label(kind, a, b, result):
    if kind == "root":
        return f"{format_value(a)}√{format_value(b)} = {format_value(result)}"
    return f"{format_value(a)} {BINARY_SYMBOLS[kind]} {format_value(b)} = {format_value(result)}"


def format_unary_label(kind, a, result):
    if kind == "!":
        return f"{format_value(a)}! = {format_value(result)}"
    return f"√{format_value(a)} = {format_value(result)}"


def solve_puzzle(digits, target=10):
    """Finds a step-by-step tile history sequence (list of dicts) to reach target from digits.
    Returns list of dicts with 'label' (matching tile_history shape) or None if unsolvable.
    """
    initial_tiles = tuple((float(d), ()) for d in digits)
    queue = deque([initial_tiles])
    visited = set()

    binary_ops = ["+", "-", "*", "/", "^", "root"]
    unary_ops = ["sqrt", "!"]

    while queue:
        tiles = queue.popleft()

        if len(tiles) == 1 and is_within_tolerance(tiles[0][0], target):
            return list(tiles[0][1])

        state_key = tuple(sorted((round(t[0], 4), len(t[1])) for t in tiles))
        if state_key in visited:
            continue
        visited.add(state_key)

        for i, (val, hist) in enumerate(tiles):
            for op in unary_ops:
                try:
                    res = apply_unary(op, val)
                    label = format_unary_label(op, val, res)
                    new_hist = hist + ({"type": "unary", "op": op, "label": label},)
                    rem = tiles[:i] + ((res, new_hist),) + tiles[i + 1:]
                    if len(rem) == 1 and is_within_tolerance(res, target):
                        return list(new_hist)
                    queue.append(rem)
                except OpError:
                    pass

        n = len(tiles)
        for i in range(n):
            for j in range(n):
                if i == j:
                    continue
                left_val, left_hist = tiles[i]
                right_val, right_hist = tiles[j]
                combined_hist = left_hist + right_hist

                for op in binary_ops:
                    try:
                        res = apply_binary(op, left_val, right_val)
                        label = format_binary_label(op, left_val, right_val, res)
                        new_hist = combined_hist + ({"type": "binary", "op": op, "label": label},)
                        rem = tuple(t for k, t in enumerate(tiles) if k != i and k != j) + ((res, new_hist),)
                        if len(rem) == 1 and is_within_tolerance(res, target):
                            return list(new_hist)
                        queue.append(rem)
                    except OpError:
                        pass

    return None
