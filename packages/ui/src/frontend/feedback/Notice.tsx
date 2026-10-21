import { CircleCheckIcon, InfoIcon, OctagonXIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@devmentor/ui/lib/utils";

// Public kit counterpart of the signed-in Alert (F3: info | success | error): the same compact
// bordered panel (B4), the variant colours the icon and title, the text stays in the body colour
// (WCAG 1.4.1). Errors use role="alert", news role="status" (E01 UI/UX). Docs: notice.mdx.
const variants = {
  info: { role: "status", Icon: InfoIcon, tone: "text-foreground" },
  success: { role: "status", Icon: CircleCheckIcon, tone: "text-success" },
  error: { role: "alert", Icon: OctagonXIcon, tone: "text-destructive" },
} as const;

export interface NoticeProps extends Omit<ComponentProps<"div">, "title"> {
  variant?: keyof typeof variants;
  /** What happened, in one sentence. */
  title: ReactNode;
  /** What to do next; may hold a link or a button. */
  children?: ReactNode;
}

export function Notice({ variant = "info", title, children, className, ...props }: NoticeProps) {
  const { role, Icon, tone } = variants[variant];
  return (
    <div
      role={role}
      data-slot="notice"
      data-variant={variant}
      className={cn(
        "grid w-full grid-cols-icon-text gap-x-in-group gap-y-list-row-gap rounded-panel border border-border bg-card p-panel-compact text-left text-body text-card-foreground",
        className
      )}
      {...props}
    >
      <Icon aria-hidden className={cn("row-span-2 mt-0.5 size-4", tone)} />
      <div className={cn("text-label", tone)}>{title}</div>
      {children ? <div className="flex flex-col items-start gap-in-group">{children}</div> : null}
    </div>
  );
}
