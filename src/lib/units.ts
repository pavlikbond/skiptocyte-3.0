export type UnitParts =
  | { kind: "plain"; text: string }
  | { kind: "super"; base: string; exp: string; rest: string };

/** Split `x10^9/L` into base, exponent, and remainder. */
export function parseUnits(units: string): UnitParts {
  const match = /^(.*?)\^([+-]?\d+)(.*)$/.exec(units);
  if (!match) return { kind: "plain", text: units };
  return { kind: "super", base: match[1], exp: match[2], rest: match[3] };
}
