import { z } from "zod";

import { priceDollarsSchema } from "../money/money.schema";

export const mentorAreas = ["typescript", "react", "python"] as const;
export const mentorAreaSchema = z.enum(mentorAreas, { error: "Choose an area" });
export type MentorArea = z.output<typeof mentorAreaSchema>;
export const mentorProfileIdSchema = z.uuid();

export const MENTOR_DESCRIPTION_MAX_LENGTH = 2_000;
export const PUBLIC_WORK_LINK_MAX_LENGTH = 2_048;
export const PUBLIC_WORK_LINK_MAX_COUNT = 5;

const publicWorkLinksSchema = z
  .string({ error: "Add at least one link" })
  .transform((value) => value.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean))
  .superRefine((links, context) => {
    if (links.length === 0) {
      context.addIssue({ code: "custom", message: "Add at least one link" });
      return;
    }
    if (links.length > PUBLIC_WORK_LINK_MAX_COUNT) {
      context.addIssue({ code: "custom", message: `Use at most ${PUBLIC_WORK_LINK_MAX_COUNT} public-work links` });
    }

    const seen = new Set<string>();
    links.forEach((link, index) => {
      const line = index + 1;
      if (link.length > PUBLIC_WORK_LINK_MAX_LENGTH) {
        context.addIssue({ code: "custom", message: `Line ${line}: use at most ${PUBLIC_WORK_LINK_MAX_LENGTH.toLocaleString("en-US")} characters` });
        return;
      }

      try {
        if (new URL(link).protocol !== "https:") throw new Error("not https");
      } catch {
        context.addIssue({ code: "custom", message: `Line ${line}: use a full https:// link` });
        return;
      }

      if (seen.has(link)) {
        context.addIssue({ code: "custom", message: `Line ${line}: remove the duplicate link` });
      }
      seen.add(link);
    });
  });

export const mentorProfileSchema = z.object({
  area: mentorAreaSchema,
  description: z
    .string({ error: "Describe what you help with" })
    .trim()
    .min(1, "Describe what you help with")
    .max(MENTOR_DESCRIPTION_MAX_LENGTH, `Use at most ${MENTOR_DESCRIPTION_MAX_LENGTH.toLocaleString("en-US")} characters`),
  publicWorkLinks: publicWorkLinksSchema,
  price25Dollars: priceDollarsSchema,
  price50Dollars: priceDollarsSchema,
});

export type MentorProfileInput = z.output<typeof mentorProfileSchema>;
