// Shared by the layouts' AppWelcomeNotice and /account's ForgetWelcome (accounts SM-AC7).

/**
 * Removes only the `welcome` parameter from the current address, keeping the other parameters,
 * the hash and `history.state`, without a navigation, so a reload does not show the one-time
 * notice again. Next.js syncs `replaceState` with its router. Call it from an effect.
 */
export function dropWelcomeFlag(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("welcome");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
