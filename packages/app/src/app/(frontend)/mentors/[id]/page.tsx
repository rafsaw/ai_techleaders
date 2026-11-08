import { formatMoney, isAppError } from "@devmentor/core";
import { MentorProfileHeader } from "@devmentor/ui/components/mentors/MentorProfileHeader";
import { NotBookableNotice } from "@devmentor/ui/components/mentors/NotBookableNotice";
import { PriceList } from "@devmentor/ui/components/mentors/PriceList";
import { PublicWorkLinks } from "@devmentor/ui/components/mentors/PublicWorkLinks";
import { TextOnlyNote } from "@devmentor/ui/components/mentors/TextOnlyNote";
import { linkButtonVariants } from "@devmentor/ui/frontend/actions/LinkButton";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { backToMentorsHref } from "@/app/(frontend)/mentors/mentor-areas";
import { getPrincipal } from "@/server/auth/page-guards";
import { createRequestScope } from "@/server/container";

export const metadata: Metadata = { title: "Mentor profile" };

export default async function PublicMentorProfilePage({ params, searchParams }: PageProps<"/mentors/[id]">) {
  await connection();
  await getPrincipal();
  const { id } = await params;
  // Where "Back to mentors" goes (E03 Flow 2): the filter a listing visit used, otherwise the
  // whole listing. Read from the URL only; it never affects access, eligibility or content.
  const backHref = backToMentorsHref((await searchParams).fromArea);
  let profile;
  try {
    profile = await createRequestScope().cradle.mentorProfileService.getPublic(id);
  } catch (error) {
    if (isAppError(error) && error.status === 404) notFound();
    throw error;
  }

  return (
    <main className="mx-auto w-full max-w-content px-page-gutter py-section">
      <div className="flex w-full flex-col gap-component">
        <div>
          <Link href={backHref} className={linkButtonVariants({ variant: "link" })}>
            Back to mentors
          </Link>
        </div>
        {profile.bookable ? null : <NotBookableNotice />}
        <div className="grid gap-component lg:grid-cols-3">
          <MentorProfileHeader
            className="lg:col-span-2"
            displayName={profile.displayName}
            area={profile.area}
            description={profile.description}
          />
          <aside aria-label="Sessions" className="flex flex-col gap-in-group lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <PriceList prices={{ 25: formatMoney(profile.prices[25]), 50: formatMoney(profile.prices[50]) }} />
            <TextOnlyNote />
          </aside>
          <PublicWorkLinks className="lg:col-span-2" links={profile.publicWorkLinks} />
        </div>
      </div>
    </main>
  );
}
