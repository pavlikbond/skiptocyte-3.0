import { describe, expect, it } from "vitest";
import { mapAuthError } from "./authErrors";

describe("mapAuthError", () => {
  it("maps known Firebase codes onto fields", () => {
    expect(mapAuthError({ code: "auth/email-already-in-use" })).toEqual({
      field: "email",
      message: "An account with this email already exists.",
    });
    expect(mapAuthError({ code: "auth/invalid-credential" })).toEqual({
      field: "password",
      message: "Incorrect email or password.",
    });
    expect(mapAuthError({ code: "auth/too-many-requests" })).toEqual({
      field: "root",
      message: "Too many attempts. Try again later.",
    });
  });

  it("does not leak raw Firebase messages for unknown errors", () => {
    expect(mapAuthError(new Error("Firebase: Error (auth/mystery)."))).toEqual({
      field: "root",
      message: "Something went wrong. Try again.",
    });
    expect(mapAuthError({ code: "auth/mystery" })).toEqual({
      field: "root",
      message: "Something went wrong. Try again.",
    });
  });
});
