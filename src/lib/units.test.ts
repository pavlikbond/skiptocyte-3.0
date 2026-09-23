import { describe, expect, it } from "vitest";
import { parseUnits, unitBody } from "./units";

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

describe("unitBody", () => {
  it("treats x10^9/L as a times 10^9/L", () => {
    expect(unitBody("x10^9/L")).toEqual({ times: true, text: "10^9/L" });
  });

  it("treats a stored 10^9/L the same way", () => {
    expect(unitBody("10^9/L")).toEqual({ times: true, text: "10^9/L" });
  });

  it("does not double a times sign already in the string", () => {
    expect(unitBody("×10^9/L")).toEqual({ times: true, text: "10^9/L" });
    expect(unitBody("× 10^3/uL")).toEqual({ times: true, text: "10^3/uL" });
  });

  it("leaves ordinary units alone", () => {
    expect(unitBody("g/dL")).toEqual({ times: false, text: "g/dL" });
    expect(unitBody("10^n/L")).toEqual({ times: false, text: "10^n/L" });
  });
});
