import { mentorAreas } from "@devmentor/core/validators/mentors/mentor-profile.schema";
import { AREA_LABELS } from "@devmentor/ui/components/mentors/MentorProfileHeader";
import { linkButtonVariants } from "@devmentor/ui/frontend/actions/LinkButton";
import Link from "next/link";

import { mentorsHref, type AreaSelection } from "@/app/(frontend)/mentors/mentor-areas";

// The listing's area filter (E03 Flow 1): four navigation links, not a form or a client-side
// search. Each URL is shareable, so the current choice lives in the address bar. The selected
// link is filled rather than only recoloured and carries aria-current="page", so the choice is
// evident without relying on colour (WCAG 1.4.1). Page-local until a second page filters by area.

function FilterLink({ href, label, selected }: { href: string; label: string; selected: boolean }) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={linkButtonVariants({ variant: selected ? "default" : "outline" })}
    >
      {label}
    </Link>
  );
}

export function AreaFilter({ selection }: { selection: AreaSelection }) {
  return (
    <nav aria-label="Area">
      {/* Wraps at narrow widths; every item keeps its own focus ring. */}
      <ul className="flex flex-wrap gap-in-group">
        <li>
          <FilterLink href={mentorsHref()} label="All" selected={selection.kind === "all"} />
        </li>
        {mentorAreas.map((area) => (
          <li key={area}>
            <FilterLink
              href={mentorsHref(area)}
              label={AREA_LABELS[area]}
              selected={selection.kind === "area" && selection.area === area}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
