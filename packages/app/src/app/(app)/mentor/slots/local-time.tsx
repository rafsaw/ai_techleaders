"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const client = () => true;
const server = () => false;

export function LocalTime({ instant }: { instant: string }) {
  const mounted = useSyncExternalStore(subscribe, client, server);
  const text = mounted
    ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(instant))
    : instant;
  return <time dateTime={instant}>{text}</time>;
}
