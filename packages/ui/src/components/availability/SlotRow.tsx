"use client";

import { useState, type ReactNode } from "react";
import { OctagonXIcon } from "lucide-react";

import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { Alert, AlertTitle } from "@devmentor/ui/components/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@devmentor/ui/components/alert-dialog";
import { Badge } from "@devmentor/ui/components/badge";
import { Button } from "@devmentor/ui/components/button";
import { Spinner } from "@devmentor/ui/components/spinner";

// One upcoming slot on /mentor/slots (E02 Flow 4): start in the viewer's zone (the page passes
// its LocalTime as children), the zone name, the reservation rule and the state. Open rows have
// Remove with a confirmation; booked rows show the spec's sentence instead. Docs: slot-list.mdx.

export const BOOKED_SENTENCE = "This slot is booked. To cancel, the mentee or you contact the DevMentor team by email.";
export const RESERVES = "Reserves 50 minutes; the mentee picks 25 or 50";

export interface SlotRowProps {
  /** The start, formatted in the viewer's zone (`<LocalTime>`), e.g. "Wed, 4 Nov, 18:30". */
  children: ReactNode;
  timeZone: string;
  booked: boolean;
  /** DELETE /api/availability/slots?id=…; required for open rows. */
  remove?: () => Promise<ApiResult<unknown>>;
}

function RemoveSlot({ when, remove }: { when: ReactNode; remove: () => Promise<ApiResult<unknown>> }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(undefined);
      }}
    >
      <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>Remove</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove the slot on {when}?</AlertDialogTitle>
          <AlertDialogDescription>Mentees will no longer see this time.</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert variant="destructive">
            <OctagonXIcon aria-hidden />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{error ? "Close" : "Cancel"}</AlertDialogCancel>
          {error ? null : (
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                const result = await remove();
                setPending(false);
                if (result.ok) setOpen(false);
                else setError(result.error.message);
              }}
            >
              {pending ? (
                <>
                  <Spinner aria-hidden />
                  Removing slot…
                </>
              ) : (
                "Remove slot"
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SlotRow({ children, timeZone, booked, remove }: SlotRowProps) {
  return (
    <li data-slot="slot-row" className="grid grid-cols-text-action items-start gap-x-in-group gap-y-in-group py-list-row-y">
      <div className="flex min-w-0 flex-col gap-list-row-gap">
        <span className="text-row-title tabular-nums">{children}</span>
        <span className="text-meta text-muted-foreground wrap-anywhere">
          {timeZone} · {RESERVES}
        </span>
        {booked ? <span className="text-meta text-muted-foreground">{BOOKED_SENTENCE}</span> : null}
      </div>
      <div className="flex flex-col items-end gap-in-group">
        <Badge variant={booked ? "secondary" : "outline"}>{booked ? "Booked" : "Open"}</Badge>
        {!booked && remove ? <RemoveSlot when={children} remove={remove} /> : null}
      </div>
    </li>
  );
}
