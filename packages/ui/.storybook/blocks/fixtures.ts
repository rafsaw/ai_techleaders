import { z } from "zod";

// Story-only stand-ins for schemas that core does not have yet. Rules from the specs:
// E01 2026-10-17-accounts-and-roles.md (display name 1–100 after trim, password ≥ 15, AD6) and
// E02 2026-10-18-mentor-setup.md Flow 2 (area, description, links, prices). Never exported.

export const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(100, "Use 1–100 characters."),
  email: z.email("Enter a valid email address"),
  password: z.string().min(15, "Use at least 15 characters"),
});

export const accountSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(100, "Use 1–100 characters."),
});

const price = z.coerce
  .number<string>("Enter a whole number of dollars")
  .int("Enter a whole number of dollars")
  .min(5, "The lowest price is $5")
  .max(1000, "The highest price is $1,000");

export const mentorProfileSchema = z.object({
  area: z.enum(["typescript", "react", "python"], "Choose an area"),
  description: z.string().trim().min(1, "Describe what you help with").max(2000, "Use at most 2,000 characters"),
  publicWorkLinks: z.string().trim().min(1, "Add at least one link"),
  price25Dollars: price,
  price50Dollars: price,
});

/** The /api envelope helpers MSW handlers answer with. */
export const ok = <T,>(data: T, status = 200) => Response.json({ ok: true, data }, { status });
export const fail = (status: number, code: string, message: string, fieldErrors?: Record<string, string[]>) =>
  Response.json({ ok: false, error: fieldErrors ? { code, message, fieldErrors } : { code, message } }, { status });
