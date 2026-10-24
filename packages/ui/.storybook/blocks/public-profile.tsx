import { MentorProfileHeader, type Area } from "@devmentor/ui/components/mentors/MentorProfileHeader";
import { NotBookableNotice } from "@devmentor/ui/components/mentors/NotBookableNotice";
import { PriceList } from "@devmentor/ui/components/mentors/PriceList";
import { PublicWorkLinks } from "@devmentor/ui/components/mentors/PublicWorkLinks";
import { TextOnlyNote } from "@devmentor/ui/components/mentors/TextOnlyNote";

// Story-only: the /mentors/[id] composition, shared by Patterns/Detail view and
// Screens/E02/Public profile (P-DV1, P-DV2, proposal approved by Rafał). Never exported.

// PublicMentorProfileDto (E02 API), with prices already formatted by the page (formatMoney, P17).
export interface Profile {
  displayName: string;
  area: Area;
  description: string;
  publicWorkLinks: string[];
  prices: { 25: string; 50: string };
  bookable: boolean;
}

export const ADA_PROFILE: Profile = {
  displayName: "Ada Nowak",
  area: "typescript",
  description:
    "I maintain the type definitions of an open-source form library.\nAsk me about generics, strict mode migrations and type errors you can't read.",
  publicWorkLinks: ["https://github.com/adanowak/strict-migration", "https://ada.dev/notes/typescript-generics-in-forms"],
  prices: { 25: "$40", 50: "$70" },
  bookable: true,
};

/**
 * /mentors/[id]. Status first, then who; at ≥ 1024 px the prices sit in a side column next to
 * the description (E04 puts Book there); below that they follow the description.
 */
export function PublicProfile({ profile }: { profile: Profile }) {
  return (
    <div className="flex w-full flex-col gap-component">
      {profile.bookable ? null : <NotBookableNotice />}
      <div className="grid gap-component lg:grid-cols-3">
        <MentorProfileHeader
          className="lg:col-span-2"
          displayName={profile.displayName}
          area={profile.area}
          description={profile.description}
        />
        <aside aria-label="Sessions" className="flex flex-col gap-in-group lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <PriceList prices={profile.prices} />
          <TextOnlyNote />
        </aside>
        <PublicWorkLinks className="lg:col-span-2" links={profile.publicWorkLinks} />
      </div>
    </div>
  );
}

