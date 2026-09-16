import { zodResolver } from "@hookform/resolvers/zod";
import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "./authSchema";

const resolverOptions = {
  criteriaMode: "firstError" as const,
  fields: {},
  shouldUseNativeValidation: false,
};

describe("loginSchema", () => {
  it("requires an email", () => {
    const result = loginSchema.safeParse({ email: "  ", password: "secret" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).toBe("Enter your email");
  });

  it("rejects a browser-passing but invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "secret" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).toBe("Enter a valid email");
  });

  it("requires a password without a length floor", () => {
    const empty = loginSchema.safeParse({ email: "a@b.com", password: "" });
    expect(empty.success).toBe(false);
    if (empty.success) return;
    expect(empty.error.issues[0]?.message).toBe("Enter your password");

    const short = loginSchema.safeParse({ email: "a@b.com", password: "ab" });
    expect(short.success).toBe(true);
  });
});

describe("signupSchema", () => {
  it("requires at least 6 password characters", () => {
    const empty = signupSchema.safeParse({ email: "a@b.com", password: "" });
    expect(empty.success).toBe(false);
    if (empty.success) return;
    expect(empty.error.issues[0]?.message).toBe("Enter a password");

    const short = signupSchema.safeParse({ email: "a@b.com", password: "12345" });
    expect(short.success).toBe(false);
    if (short.success) return;
    expect(short.error.issues[0]?.message).toBe("Password must be at least 6 characters");
  });

  it("accepts a valid email and password", () => {
    const result = signupSchema.safeParse({
      email: "  tech@example.com  ",
      password: "secret",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.email).toBe("tech@example.com");
  });
});

describe("zodResolver(loginSchema)", () => {
  it("returns field errors for empty values", async () => {
    const result = await zodResolver(loginSchema)(
      { email: "", password: "" },
      undefined,
      resolverOptions,
    );
    expect(result.values).toEqual({});
    expect(result.errors.email?.message).toBe("Enter your email");
    expect(result.errors.password?.message).toBe("Enter your password");
  });

  it("returns a field error for an invalid email", async () => {
    const result = await zodResolver(loginSchema)(
      { email: "not-an-email", password: "secret" },
      undefined,
      resolverOptions,
    );
    expect(result.errors.email?.message).toBe("Enter a valid email");
  });
});
