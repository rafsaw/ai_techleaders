import { z } from "zod";

import { COMMON_PASSWORDS } from "./data";

// The same rules the E01 spec gives the routes (display name 1-100 after trim, password >= 15, AD6).
// The 72-byte and common-password rules come from AD6; their wording is a simulation choice.

export const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(100, "Use 1–100 characters."),
  email: z.email("Enter a valid email address"),
  password: z
    .string()
    .min(15, "Use at least 15 characters")
    .refine((value) => new TextEncoder().encode(value).length <= 72, "Use at most 72 bytes")
    .refine((value) => !COMMON_PASSWORDS.includes(value.toLowerCase()), "This password is too common. Choose another one."),
});

export const emailConfirmSchema = z.object({
  password: z.string().min(1, "Enter your password"),
});

export const accountSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(100, "Use 1–100 characters."),
});
