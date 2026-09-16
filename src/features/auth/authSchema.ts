import { z } from "zod";

export const authEmailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email")
  .email("Enter a valid email");

export const loginSchema = z.object({
  email: authEmailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const signupSchema = z.object({
  email: authEmailSchema,
  password: z
    .string()
    .min(1, "Enter a password")
    .min(6, "Password must be at least 6 characters"),
});

export type AuthFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
