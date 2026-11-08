import { AREA_LABELS } from "@devmentor/ui/components/mentors/MentorProfileHeader";
import { linkButtonVariants } from "@devmentor/ui/frontend/actions/LinkButton";
import Link from "next/link";

import type { PublicMentorSummaryDto } from "@/server/services/mentors/mentor-profile.service";

// One listing card (E03 Flow 1): public display name, the single area (MD3) and the normalized
// description excerpt. No prices — both session prices stay on the profile (PO review 2026-11-04)
// — and no rating, review, employer badge or availability count (N02). The area pill repeats
// MentorProfileHeader's plain-Tailwind badge, which the public area may not take from shadcn.
// Page-local until a second page lists mentors.

export function MentorCard({ mentor, href }: { mentor: PublicMentorSummaryDto; href: string }) {
  return (
    <article className="flex flex-col gap-in-group rounded-panel border border-border p-panel">
      <div className="flex flex-wrap items-center gap-in-group">
        <h2 className="min-w-0 text-row-title wrap-anywhere">
          <Link href={href} className={linkButtonVariants({ variant: "link" })}>
            {mentor.displayName}
          </Link>
        </h2>
        <span className="inline-flex h-badge shrink-0 items-center rounded-pill border border-border px-badge-x text-label whitespace-nowrap text-foreground">
          {AREA_LABELS[mentor.area]}
        </span>
      </div>
      <p className="max-w-text text-body text-muted-foreground wrap-anywhere">{mentor.descriptionExcerpt}</p>
    </article>
  );
}
