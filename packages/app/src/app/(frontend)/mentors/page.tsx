import { AREA_LABELS } from "@devmentor/ui/components/mentors/MentorProfileHeader";
import { linkButtonVariants } from "@devmentor/ui/frontend/actions/LinkButton";
import { Notice } from "@devmentor/ui/frontend/feedback/Notice";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { AreaFilter } from "@/app/(frontend)/mentors/area-filter";
import { MentorCard } from "@/app/(frontend)/mentors/mentor-card";
import {
  mentorProfileHref,
  MENTORS_PATH,
  readAreaSelection,
  type AreaSelection,
} from "@/app/(frontend)/mentors/mentor-areas";
import { getPrincipal } from "@/server/auth/page-guards";
import { createRequestScope } from "@/server/container";
import type { PublicMentorSummaryDto } from "@/server/services/mentors/mentor-profile.service";

export const metadata: Metadata = {
  title: "Find a mentor",
  description: "Browse the DevMentor mentors taking text sessions in TypeScript, React or Python.",
};

const UNKNOWN_AREA = "Unknown area";
const ALL_MENTORS = "All mentors";

/** A link back to the unfiltered listing: the way out of both an unknown area and an empty one. */
function AllMentorsLink() {
  return (
    <Link href={MENTORS_PATH} className={linkButtonVariants({ variant: "link" })}>
      {ALL_MENTORS}
    </Link>
  );
}

/**
 * An empty listing is a valid state (brief A04 is untested), so it says so plainly and never
 * fabricates a card. Page-local text, because the signed-in EmptyState is not a public component.
 */
function NoMentors({ selection }: { selection: AreaSelection }) {
  return (
    <div className="flex max-w-text flex-col items-start gap-in-group">
      <p className="text-body text-muted-foreground">
        {selection.kind === "area"
          ? `No ${AREA_LABELS[selection.area]} mentors are taking bookings yet.`
          : "No mentors are taking bookings yet."}
      </p>
      {selection.kind === "area" ? <AllMentorsLink /> : null}
    </div>
  );
}

/**
 * The results, headed by the current filter in plain words. The filter links already mark the
 * choice with aria-current and a filled style, and this names it in text as well, so the scope
 * of the list does not rest on telling two button styles apart.
 */
function MentorList({ mentors, selection }: { mentors: PublicMentorSummaryDto[]; selection: AreaSelection }) {
  if (mentors.length === 0) return <NoMentors selection={selection} />;
  return (
    <div className="flex flex-col gap-between-groups">
      <p className="text-body text-muted-foreground">
        {selection.kind === "area" ? `Showing ${AREA_LABELS[selection.area]} mentors.` : "Showing all mentors."}
      </p>
      <ul aria-label="Mentors" className="flex flex-col gap-between-groups">
        {mentors.map((mentor) => (
          <li key={mentor.id}>
            <MentorCard mentor={mentor} href={mentorProfileHref(mentor.id, selection)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The public mentor directory (E03 Flow 1). Open to anyone: it reads the principal only so a
 * signed-in visit records activity, and shows the same mentors either way. Rendered at request
 * time from stored bookability, with no cache, so a payout or role change applies on the next
 * visit. An unknown area is a recoverable mistake — it offers the unfiltered list instead of
 * querying for a value the enum rejected.
 */
export default async function MentorsPage({ searchParams }: PageProps<"/mentors">) {
  await connection();
  await getPrincipal();
  const selection = readAreaSelection((await searchParams).area);
  const mentors =
    selection.kind === "unknown"
      ? []
      : await createRequestScope().cradle.mentorProfileService.listBookable(
          selection.kind === "area" ? selection.area : undefined
        );

  return (
    <main className="mx-auto w-full max-w-content px-page-gutter py-section">
      <div className="flex flex-col gap-component">
        <h1 className="text-page-title">Find a mentor</h1>
        <AreaFilter selection={selection} />
        {selection.kind === "unknown" ? (
          <Notice variant="info" title={UNKNOWN_AREA}>
            <AllMentorsLink />
          </Notice>
        ) : (
          <MentorList mentors={mentors} selection={selection} />
        )}
      </div>
    </main>
  );
}
