export type BinaryOpKind = "+" | "-" | "*" | "/" | "^" | "root";
export type UnaryOpKind = "!" | "sqrt";

const EPSILON = 1e-9;
const INTEGER_TOLERANCE = 1e-6;

export function isCloseToInteger(n: number): boolean {
  return Math.abs(n - Math.round(n)) < INTEGER_TOLERANCE;
}

export function isWithinTolerance(value: number, target: number): boolean {
  return Math.abs(value - target) < INTEGER_TOLERANCE;
}

export type OpOutcome = { ok: true; value: number } | { ok: false; error: string };

function finite(value: number): OpOutcome {
  if (!Number.isFinite(value)) {
    return { ok: false, error: "That operation is undefined here." };
  }
  return { ok: true, value };
}

// a, b are the operands in fill order (a = first tile tapped, b = second).
export function applyBinary(kind: BinaryOpKind, a: number, b: number): OpOutcome {
  switch (kind) {
    case "+":
      return finite(a + b);
    case "-":
      return finite(a - b);
    case "*":
      return finite(a * b);
    case "/":
      if (Math.abs(b) < EPSILON) return { ok: false, error: "Cannot divide by zero." };
      return finite(a / b);
    case "^":
      if (Math.abs(a) < EPSILON && Math.abs(b) < EPSILON) {
        return { ok: false, error: "0^0 is undefined." };
      }
      if (a < 0 && !isCloseToInteger(b)) {
        return { ok: false, error: "Cannot raise a negative number to a non-integer power." };
      }
      return finite(Math.pow(a, b));
    case "root": {
      // a = degree, b = radicand -> the a-th root of b, i.e. b^(1/a).
      // JS's Math.pow(negative, fraction) is always NaN, even for e.g. cube
      // roots which have a well-defined real result, so odd integer degrees
      // against a negative radicand need to be handled by hand.
      if (Math.abs(a) < EPSILON) return { ok: false, error: "Root degree cannot be 0." };
      if (b < 0) {
        if (!isCloseToInteger(a)) {
          return { ok: false, error: "Cannot take that root of a negative number." };
        }
        const degree = Math.round(a);
        if (degree % 2 === 0) {
          return { ok: false, error: "Cannot take an even root of a negative number." };
        }
        return finite(-Math.pow(-b, 1 / degree));
      }
      return finite(Math.pow(b, 1 / a));
    }
  }
}

export function applyUnary(kind: UnaryOpKind, a: number): OpOutcome {
  switch (kind) {
    case "sqrt":
      if (a < 0) return { ok: false, error: "Cannot take the square root of a negative number." };
      return finite(Math.sqrt(a));
    case "!": {
      if (a < 0 || !isCloseToInteger(a)) {
        return { ok: false, error: "Factorial requires a non-negative whole number." };
      }
      const n = Math.round(a);
      if (n > 170) return { ok: false, error: "That factorial is too large." };
      let result = 1;
      for (let i = 2; i <= n; i++) result *= i;
      return finite(result);
    }
  }
}

export function formatValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const rounded = Math.round(value * 1e6) / 1e6;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

const BINARY_SYMBOLS: Record<BinaryOpKind, string> = {
  "+": "+", "p"
  "-": "−",
  "*": "×",
  "/": "÷", "d"
  "^": "^", "e"
  root: "√",
};

export function binarySymbol(kind: BinaryOpKind): string {
  return BINARY_SYMBOLS[kind];
}

export function formatBinaryLabel(kind: BinaryOpKind, a: number, b: number, result: number): string {
  if (kind === "root") {
    return `${formatValue(a)}√${formatValue(b)} = ${formatValue(result)}`;
  }
  return `${formatValue(a)} ${BINARY_SYMBOLS[kind]} ${formatValue(b)} = ${formatValue(result)}`;
}

export function formatUnaryLabel(kind: UnaryOpKind, a: number, result: number): string {
  if (kind === "!") return `${formatValue(a)}! = ${formatValue(result)}`;
  return `√${formatValue(a)} = ${formatValue(result)}`;
}
