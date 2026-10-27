// All data is fictional and comes from the approved screen map (lekcja-07/mapa-ekranow.md, section 3)
// and the product brief. Nothing here is a real person, address or secret.

export type Role = "mentee" | "mentor" | "operator";

export interface Account {
  id: string;
  displayName: string;
  email: string;
  roles: Role[];
  githubLogin?: string;
  /** Demo password; a simulation has no hashing. */
  password?: string;
  confirmed: boolean;
}

export interface GithubIdentity {
  key: string;
  login: string;
  /** Name on the GitHub profile; null when the profile has none. */
  name: string | null;
  /** Verified primary email; null when GitHub has none. */
  email: string | null;
}

export interface ConfirmLink {
  token: string;
  accountId: string;
  sentAt: number;
  usedAt?: number;
  /** A newer registration replaced it, or GitHub claimed the account (the link is gone). */
  replaced?: boolean;
}

export interface Invitation {
  token: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  revoked?: boolean;
  usedAt?: number;
}

export interface Mail {
  id: string;
  to: string;
  subject: string;
  /** Paragraphs; "{link}" marks where the link goes. */
  paragraphs: string[];
  /** Product path the link opens. */
  href?: string;
  sentAt: number;
}

const utc = (iso: string) => Date.parse(iso);

/** The demo clock: Monday 2026-11-02 10:00:00 UTC (map, section 3). */
export const NOW = utc("2026-11-02T10:00:00Z");
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const CONFIRM_LINK_TTL = 24 * HOUR;
export const INVITATION_TTL = 14 * DAY;

export const TEAM_EMAIL = "team@example.test";

export const SEED_ACCOUNTS: Account[] = [
  { id: "a1", displayName: "Ola Nowak", email: "ola.nowak@example.test", roles: ["mentee"], githubLogin: "ola-nowak", confirmed: true },
  { id: "a2", displayName: "Tomek Wiśniewski", email: "tomek.wisniewski@example.test", roles: ["mentee"], password: "zielona-lampa-nad-rzeka", confirmed: true },
  { id: "a3", displayName: "Ewa Lis", email: "ewa.lis@example.test", roles: ["mentee"], password: "kamienna-brama-2026-x", confirmed: false },
  { id: "a4", displayName: "Marta Zielińska", email: "marta.zielinska@example.test", roles: ["mentee", "mentor"], githubLogin: "marta-z", confirmed: true },
  { id: "a5", displayName: "Jan Kruk", email: "jan.kruk@example.test", roles: ["mentee", "operator"], githubLogin: "jan-kruk", confirmed: true },
  { id: "a6", displayName: "Zofia Maj", email: "zofia.maj@example.test", roles: ["mentee", "mentor", "operator"], password: "maly-statek-na-jeziorze", confirmed: true },
  { id: "a7", displayName: "Piotr Sowa", email: "piotr.sowa@example.test", roles: ["mentee"], githubLogin: "piotr-sowa", password: "stara-mapa-z-poddasza", confirmed: true },
  { id: "i1", displayName: "Bartek Dąb", email: "bartek.dab@example.test", roles: ["mentee"], githubLogin: "bartek-dab", confirmed: true },
];

/** The GitHub identities c02 can choose (map, section 2, c02). */
export const GITHUB_IDENTITIES: GithubIdentity[] = [
  { key: "kuba", login: "kuba-lis", name: "Jakub Lis", email: "kuba.lis@example.test" },
  { key: "ola", login: "ola-nowak", name: "Ola Nowak", email: "ola.nowak@example.test" },
  { key: "wiktor", login: "wiktor-bor", name: "Wiktor Bor", email: "wiktor.bor@example.test" },
  { key: "bartek", login: "bartek-dab", name: "Bartek Dąb", email: "bartek.dab@example.test" },
  { key: "jan", login: "jan-kruk", name: "Jan Kruk", email: "jan.kruk@example.test" },
];

export const IDENTITY_LABELS: Record<string, string> = {
  kuba: "Kuba (new person)",
  ola: "Ola (existing account)",
  wiktor: "Wiktor (invited, new on GitHub)",
  bartek: "Bartek (invited, has an account)",
  jan: "Jan (operator)",
};

export const SEED_INVITATIONS: Invitation[] = [
  { token: "demo-bartek", email: "bartek.dab@example.test", createdAt: utc("2026-10-30T10:00:00Z"), expiresAt: utc("2026-11-13T10:00:00Z") },
  { token: "demo-celina", email: "celina.rak@example.test", createdAt: utc("2026-11-01T10:00:00Z"), expiresAt: utc("2026-11-15T10:00:00Z") },
  { token: "demo-wygasle", email: "ola.nowak@example.test", createdAt: utc("2026-10-14T10:00:00Z"), expiresAt: utc("2026-10-28T10:00:00Z") },
  { token: "demo-odwolane", email: "piotr.sowa@example.test", createdAt: utc("2026-10-31T10:00:00Z"), expiresAt: utc("2026-11-14T10:00:00Z"), revoked: true },
  { token: "demo-uzyte", email: "marta.zielinska@example.test", createdAt: utc("2026-10-18T10:00:00Z"), expiresAt: utc("2026-11-01T10:00:00Z"), usedAt: utc("2026-10-20T10:00:00Z") },
  { token: "demo-wiktor", email: "wiktor.bor@example.test", createdAt: utc("2026-11-01T10:00:00Z"), expiresAt: utc("2026-11-15T10:00:00Z") },
];

export const SEED_LINKS: ConfirmLink[] = [
  { token: "ewa-valid", accountId: "a3", sentAt: utc("2026-11-02T09:40:00Z") },
  { token: "ewa-expired", accountId: "a3", sentAt: utc("2026-10-30T10:00:00Z") },
  { token: "tomek-used", accountId: "a2", sentAt: utc("2026-10-20T10:00:00Z"), usedAt: utc("2026-10-20T10:05:00Z") },
  { token: "ewa-replaced", accountId: "a3", sentAt: utc("2026-11-02T09:10:00Z"), replaced: true },
  /** Ewa's account was later claimed through GitHub, which deletes her open links (Flow 1, step 4). */
  { token: "ewa-takeover", accountId: "a3", sentAt: utc("2026-11-02T09:20:00Z"), replaced: true },
];

/** Sample of the "common password" list that sign-up rejects (the real list is an implementation detail). */
export const COMMON_PASSWORDS = ["passwordpassword", "123456789012345", "qwertyuiopasdfghjkl", "iloveyouiloveyou"];

export const SESSION_TTL = 30 * DAY;

const UTC_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC",
});

/** "13 November 2026, 10:00 UTC" (map, section 3a: mails name the zone, they do not know the reader's). */
export function formatUtc(ms: number): string {
  return `${UTC_FORMAT.format(ms).replace(" at ", ", ")} UTC`;
}

export function confirmationMail(account: Pick<Account, "displayName" | "email">, token: string, sentAt: number): Mail {
  return {
    id: `mail-${token}`,
    to: account.email,
    subject: "Confirm your DevMentor email address",
    paragraphs: [
      `Hi ${account.displayName}, open the link below and enter the password you chose to confirm ${account.email}. The link expires in 24 hours.`,
      "{link}",
      "If you didn't create a DevMentor account, ignore this email.",
    ],
    href: `/confirm-email?token=${token}`,
    sentAt,
  };
}

export function alreadyHaveAccountMail(email: string, id: string, sentAt: number): Mail {
  return {
    id: `mail-${id}`,
    to: email,
    subject: "You already have a DevMentor account",
    paragraphs: [
      "Someone tried to create a DevMentor account with this address. You can sign in with GitHub or with your password. Password reset is not available in version 1.0. If this wasn't you, ignore this email.",
    ],
    sentAt,
  };
}

export function invitationMail(invitation: Invitation): Mail {
  return {
    id: `mail-invite-${invitation.token}`,
    to: invitation.email,
    subject: "You're invited to mentor on DevMentor",
    paragraphs: [
      `We'd like you to join DevMentor as a mentor. Open the link, sign in or create an account with this email address (${invitation.email}), and choose Accept invitation. The link works once and expires on ${formatUtc(invitation.expiresAt)}.`,
      "{link}",
      "If you weren't expecting this, ignore this email.",
    ],
    href: `/invite/${invitation.token}`,
    sentAt: invitation.createdAt,
  };
}

export function seedMails(): Mail[] {
  const ewa = SEED_ACCOUNTS.find((account) => account.id === "a3")!;
  const link = SEED_LINKS.find((entry) => entry.token === "ewa-valid")!;
  return [
    confirmationMail(ewa, link.token, link.sentAt),
    ...["demo-bartek", "demo-celina", "demo-wiktor"].map((token) =>
      invitationMail(SEED_INVITATIONS.find((invitation) => invitation.token === token)!),
    ),
  ];
}
