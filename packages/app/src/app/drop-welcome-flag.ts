// Shared by the layouts' AppWelcomeNotice and /account's ForgetWelcome (accounts SM-AC7), and by
// home's invitation-accepted notice (SM-AC8a).

/**
 * Removes only the `name` parameter from the current address, keeping the other parameters, the
 * hash and `history.state`, without a navigation, so a reload does not show a one-time notice
 * again. Next.js syncs `replaceState` with its router. Call it from an effect.
 */
export function dropQueryFlag(name: string): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

/** `dropQueryFlag("welcome")`: the new account's one-time welcome notice (SM-AC7). */
export function dropWelcomeFlag(): void {
  dropQueryFlag("welcome");
}
