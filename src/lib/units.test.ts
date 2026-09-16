import { describe, expect, it } from "vitest";
import { parseUnits } from "./units";

describe("parseUnits", () => {
  it("splits x10^9/L into base, exponent, and rest", () => {
    expect(parseUnits("x10^9/L")).toEqual({
      kind: "super",
      base: "x10",
      exp: "9",
      rest: "/L",
    });
  });

  it("splits 10^6/mL", () => {
    expect(parseUnits("10^6/mL")).toEqual({
      kind: "super",
      base: "10",
      exp: "6",
      rest: "/mL",
    });
  });

  it("splits 10^3/uL", () => {
    expect(parseUnits("10^3/uL")).toEqual({
      kind: "super",
      base: "10",
      exp: "3",
      rest: "/uL",
    });
  });

  it("keeps strings without ^ as plain text", () => {
    expect(parseUnits("g/dL")).toEqual({ kind: "plain", text: "g/dL" });
  });

  it("keeps unmatched carets as plain text so /L is not swallowed", () => {
    expect(parseUnits("10^n/L")).toEqual({ kind: "plain", text: "10^n/L" });
  });
});
