"""Server-side port of frontend/lib/sandboxMath.ts.

This is the authoritative version: the multiplayer tile-solving mode trusts
nothing the client claims about intermediate or final values. Every commit a
player makes gets recomputed here from the player's actual tile state, so a
modified client can't fabricate an instant solve.
"""

import math

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
