import { Notice, type NoticeProps } from "@devmentor/ui/frontend/feedback/Notice";

// "Not taking bookings yet" (MD4, E02 Flow 2 step 4): a saved profile is public before the mentor
// is bookable, and the page offers no booking. An info Notice with no action, because there is
// nothing the visitor can do yet. Public kit only (F3). Docs: not-bookable-notice.mdx.

export const NOT_BOOKABLE = "Not taking bookings yet";

export function NotBookableNotice(props: Omit<NoticeProps, "title" | "variant" | "children">) {
  return <Notice data-slot="not-bookable-notice" variant="info" title={NOT_BOOKABLE} {...props} />;
}
