// Product paths -> prototype screens. The screen ids come from the approved map and never change.

export type ScreenId = "s01" | "s02" | "s03" | "s04" | "s05" | "s06" | "s07" | "s08" | "s11" | "s12" | "s13" | "s14";
export type Params = Record<string, string>;

export interface Viewer {
  signedIn: boolean;
  operator: boolean;
}

export interface Resolved {
  screen: ScreenId;
  params: Params;
}

/** Same rule as the spec's platform.P6: a same-origin page path, <= 512 characters, never /api or /_next. */
export function safeReturnTo(value: string | null | undefined): string | undefined {
  if (!value || value.length > 512 || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return undefined;
  if (/^\/(api|_next)(\/|$|\?)/.test(value)) return undefined;
  return value;
}

export const signInHref = (returnTo?: string) => (returnTo ? `/sign-in?returnTo=${encodeURIComponent(returnTo)}` : "/sign-in");
export const signUpHref = (returnTo?: string) => (returnTo ? `/sign-up?returnTo=${encodeURIComponent(returnTo)}` : "/sign-up");
export const githubHref = (returnTo?: string) => (returnTo ? `/api/auth/github?returnTo=${encodeURIComponent(returnTo)}` : "/api/auth/github");

/** A signed-in person is sent on from the sign-in pages (map, PO L06). */
function afterSignIn(returnTo: string | undefined): string {
  return returnTo && !/^\/(sign-in|sign-up)(\/|\?|$)/.test(returnTo) ? returnTo : "/";
}

export function resolveHref(href: string, viewer: Viewer): Resolved {
  const url = new URL(href, "https://prototype.invalid");
  const q = url.searchParams;
  const returnTo = safeReturnTo(q.get("returnTo"));
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const withReturn = (params: Params): Params => (returnTo ? { ...params, returnTo } : params);

  if (path === "/") return { screen: "s07", params: {} };

  if (path === "/sign-in" || path === "/sign-up") {
    if (viewer.signedIn) return resolveHref(afterSignIn(returnTo), viewer);
    if (path === "/sign-up") return { screen: "s02", params: withReturn({}) };
    const error = q.get("error");
    return { screen: "s01", params: withReturn(error ? { error } : {}) };
  }

  if (path === "/sign-up/check-email") {
    const email = q.get("email");
    // L22: without the email parameter the page has nothing to say.
    return email ? { screen: "s03", params: q.get("sent") === "0" ? { email, sent: "0" } : { email } } : resolveHref("/sign-up", viewer);
  }

  if (path === "/confirm-email") return { screen: "s04", params: withReturn({ token: q.get("token") ?? "" }) };

  const invite = /^\/invite\/([^/]+)$/.exec(path);
  if (invite) return { screen: "s05", params: { token: decodeURIComponent(invite[1]!) } };

  if (path === "/account") {
    if (!viewer.signedIn) return { screen: "s01", params: { returnTo: "/account" } };
    return { screen: "s06", params: q.get("welcome") === "1" ? { welcome: "1" } : {} };
  }

  if (path === "/backend") {
    if (!viewer.signedIn) return { screen: "s01", params: { returnTo: "/backend" } };
    return { screen: viewer.operator ? "s08" : "s11", params: {} };
  }

  if (path === "/api/auth/github") return { screen: "s14", params: withReturn({}) };

  if (path === "/error") return { screen: "s12", params: { code: q.get("code") ?? "internal_error" } };

  if (path === "/demo-inbox") return { screen: "s13", params: {} };

  // Everything else is a page this prototype does not have: the neutral 404.
  return { screen: "s11", params: {} };
}

export interface ScreenMeta {
  id: ScreenId;
  title: string;
  path: string;
  /** Roles that see it: W visitor, Mt mentee, Mr mentor, Op operator. */
  visible: string;
  stories: string;
}

export const SCREENS: ScreenMeta[] = [
  { id: "s01", title: "Sign in", path: "/sign-in", visible: "W (signed in: redirect)", stories: "#34, #35" },
  { id: "s02", title: "Sign up", path: "/sign-up", visible: "W (signed in: redirect)", stories: "#35, #36" },
  { id: "s03", title: "Check your inbox", path: "/sign-up/check-email", visible: "W", stories: "#35" },
  { id: "s04", title: "Confirm email", path: "/confirm-email?token=…", visible: "everyone with the link", stories: "#35" },
  { id: "s05", title: "Invitation", path: "/invite/[token]", visible: "W, Mt, Mr", stories: "#36 (#46 has no screen)" },
  { id: "s06", title: "Account", path: "/account", visible: "Mt, Mr, Op (W: redirect to s01)", stories: "#34, #36" },
  { id: "s07", title: "Home", path: "/", visible: "W, Mt, Mr, Op", stories: "#36" },
  { id: "s08", title: "Backend placeholder", path: "/backend", visible: "Op (Mt, Mr: s11; W: s01)", stories: "access control, not a story" },
  { id: "s11", title: "No access (404)", path: "any forbidden path", visible: "signed in, wrong role", stories: "access control, not a story" },
  { id: "s12", title: "Error", path: "/error", visible: "everyone, no identity", stories: "not a story" },
  { id: "s13", title: "Demo inbox", path: "prototype only", visible: "whoever runs the demo", stories: "#35, #36" },
  { id: "s14", title: "GitHub authorization (simulated)", path: "prototype only", visible: "W and everyone who clicks Sign in with GitHub", stories: "#34" },
];
