import { mentorAreaSchema, type MentorArea } from "@devmentor/core/validators/mentors/mentor-profile.schema";

// The `area` and `fromArea` query contract of the public discovery pages (E03). Isomorphic and
// data-free: the listing, the profile's return link and their tests all read a parameter the same
// way, and every URL built here is same-origin and assembled from the approved enum, never from
// visitor input.

type SearchValue = string | string[] | undefined;

/** What the visitor asked the listing to show. `unknown` is a recoverable mistake, never an error. */
export type AreaSelection = { kind: "all" } | { kind: "area"; area: MentorArea } | { kind: "unknown" };

export const MENTORS_PATH = "/mentors";

/**
 * Reads one `area` value. Missing or a single empty value means All mentors, so a copied
 * `?area=` link behaves like an omitted filter. A repeated parameter is a mistake rather than a
 * choice of its first value, so it joins every other non-empty value the enum rejects on the
 * "Unknown area" state. Matching `mentorAreaSchema`, the comparison is case-sensitive.
 */
export function readAreaSelection(value: SearchValue): AreaSelection {
  if (Array.isArray(value)) return { kind: "unknown" };
  if (value === undefined || value === "") return { kind: "all" };
  const parsed = mentorAreaSchema.safeParse(value);
  return parsed.success ? { kind: "area", area: parsed.data } : { kind: "unknown" };
}

/** The shareable listing URL for one area, or for all of them. */
export function mentorsHref(area?: MentorArea): string {
  return area ? `${MENTORS_PATH}?area=${area}` : MENTORS_PATH;
}

/**
 * "Back to mentors" on a profile: a valid `fromArea` returns to that filter, while an absent,
 * empty, unknown or repeated one returns to All mentors. Ordinary same-origin navigation — the
 * parameter never carries a return URL and never affects access or profile content.
 */
export function backToMentorsHref(fromArea: SearchValue): string {
  const selection = readAreaSelection(fromArea);
  return selection.kind === "area" ? mentorsHref(selection.area) : MENTORS_PATH;
}

/** A listing card's profile link: a filtered list hands the profile its own filter back. */
export function mentorProfileHref(id: string, selection: AreaSelection): string {
  const path = `${MENTORS_PATH}/${id}`;
  return selection.kind === "area" ? `${path}?fromArea=${selection.area}` : path;
}
