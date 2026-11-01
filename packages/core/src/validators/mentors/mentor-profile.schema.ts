import { z } from "zod";

import { priceDollarsSchema } from "../money/money.schema";

export const mentorAreas = ["typescript", "react", "python"] as const;
export const mentorAreaSchema = z.enum(mentorAreas, { error: "Choose an area" });
export type MentorArea = z.output<typeof mentorAreaSchema>;
export const mentorProfileIdSchema = z.uuid();

export const MENTOR_DESCRIPTION_MAX_LENGTH = 2_000;
export const PUBLIC_WORK_LINK_MAX_LENGTH = 2_048;
export const PUBLIC_WORK_LINK_MAX_COUNT = 5;

const trimmedLines = (value: string) => value.split(/\r?\n/u).map((line) => line.trim());

const publicWorkLinksSchema = z
  .string({ error: "Add at least one link" })
  .superRefine((value, context) => {
    const lines = trimmedLines(value);
    const links = lines.filter(Boolean);
    if (links.length === 0) {
      context.addIssue({ code: "custom", message: "Add at least one link" });
      return;
    }
    if (links.length > PUBLIC_WORK_LINK_MAX_COUNT) {
      context.addIssue({ code: "custom", message: `Use at most ${PUBLIC_WORK_LINK_MAX_COUNT} public-work links` });
    }

    const seen = new Set<string>();
    // Blank lines stay in `lines`, so a message names the line the mentor sees in the textarea.
    lines.forEach((link, index) => {
      if (!link) return;
      const line = index + 1;
      if (link.length > PUBLIC_WORK_LINK_MAX_LENGTH) {
        context.addIssue({ code: "custom", message: `Line ${line}: use at most ${PUBLIC_WORK_LINK_MAX_LENGTH.toLocaleString("en-US")} characters` });
        return;
      }

      try {
        // The URL parser drops tabs and line breaks, and PostgreSQL text cannot hold NUL.
        if (/\p{Cc}/u.test(link) || !/^https:\/\//iu.test(link) || new URL(link).protocol !== "https:") throw new Error("not https");
      } catch {
        context.addIssue({ code: "custom", message: `Line ${line}: use a full https:// link` });
        return;
      }

      if (seen.has(link)) {
        context.addIssue({ code: "custom", message: `Line ${line}: remove the duplicate link` });
      }
      seen.add(link);
    });
  })
  .transform((value) => trimmedLines(value).filter(Boolean));

export const mentorProfileSchema = z.object({
  area: mentorAreaSchema,
  description: z
    .string({ error: "Describe what you help with" })
    .trim()
    .min(1, "Describe what you help with")
    .max(MENTOR_DESCRIPTION_MAX_LENGTH, `Use at most ${MENTOR_DESCRIPTION_MAX_LENGTH.toLocaleString("en-US")} characters`)
    // PostgreSQL text cannot hold NUL, so it is a field error rather than a database 500.
    .refine((description) => !description.includes("\u0000"), "Remove the unsupported character"),
  publicWorkLinks: publicWorkLinksSchema,
  price25Dollars: priceDollarsSchema,
  price50Dollars: priceDollarsSchema,
});

export type MentorProfileInput = z.output<typeof mentorProfileSchema>;
