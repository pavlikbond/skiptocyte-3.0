export type UnitParts =
  | { kind: "plain"; text: string }
  | { kind: "super"; base: string; exp: string; rest: string };

/** Split `x10^9/L` into base, exponent, and remainder. */
export function parseUnits(units: string): UnitParts {
  const match = /^(.*?)\^([+-]?\d+)(.*)$/.exec(units);
  if (!match) return { kind: "plain", text: units };
  return { kind: "super", base: match[1], exp: match[2], rest: match[3] };
}

/**
 * A power-of-ten unit is a multiplier (`10^9/L`), even when the stored
 * string already starts with a letter x or a times sign.
 */
export function unitBody(units: string): { times: boolean; text: string } {
  const trimmed = units.trim();
  const stripped = trimmed.replace(/^[x×]\s*/i, "");
  if (/^10\^[+-]?\d+/.test(stripped)) return { times: true, text: stripped };
  return { times: false, text: trimmed };
}
