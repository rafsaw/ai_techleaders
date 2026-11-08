import {
  CURRENCY,
  NotFoundError,
  toCents,
  type Money,
  type Cradle,
  type Principal,
} from "@devmentor/core";
import {
  mentorProfileIdSchema,
  type MentorArea,
  type MentorProfileInput,
} from "@devmentor/core/validators/mentors/mentor-profile.schema";
import {
  AvailabilitySlot,
  MentorProfile,
  PayoutAccount,
  UniqueConstraintViolationException,
  User,
  UserRole,
  type EntityManager,
} from "@devmentor/db";

export type MentorProfileDto = {
  id: string;
  area: MentorArea;
  description: string;
  publicWorkLinks: string[];
  prices: { 25: Money; 50: Money };
};

export type PublicMentorProfileDto = MentorProfileDto & {
  displayName: string;
  bookable: boolean;
};

/** One card on the public listing (E03): never email, payout or price data. */
export type PublicMentorSummaryDto = {
  id: string;
  displayName: string;
  area: MentorArea;
  descriptionExcerpt: string;
};

export type MentorSetupDto = {
  profile: MentorProfileDto | null;
  payout: { status: "not_started" | "incomplete" | "pending" | "ready" | "blocked"; country: string | null; provisioningState: "pending" | "provisioned" | "reconciliation_required" | "failed" | null };
  upcomingSlots: { open: number; booked: number };
  bookable: boolean;
  publicUrl: string | null;
};

function toDto(profile: MentorProfile): MentorProfileDto {
  return {
    id: profile.id,
    area: profile.area,
    description: profile.description,
    publicWorkLinks: [...profile.publicWorkLinks],
    prices: {
      25: { amountMinor: profile.price25Cents, currency: CURRENCY },
      50: { amountMinor: profile.price50Cents, currency: CURRENCY },
    },
  };
}

/** Listing excerpt length in Unicode code points (E03 PO review, 2026-11-04). */
export const MENTOR_EXCERPT_MAX_CODE_POINTS = 160;

/**
 * Collapses the stored plain text to one line and cuts it at
 * `MENTOR_EXCERPT_MAX_CODE_POINTS`, appending `…` only when something was cut.
 * Code points, not UTF-16 units, so an emoji or other non-BMP character counts once.
 * The full description stays on the profile page.
 */
function excerpt(description: string): string {
  const normalized = description.replace(/\s+/gu, " ").trim();
  const points = [...normalized];
  if (points.length <= MENTOR_EXCERPT_MAX_CODE_POINTS) return normalized;
  return `${points.slice(0, MENTOR_EXCERPT_MAX_CODE_POINTS).join("")}…`;
}

/** Listing order (E03 PO follow-up): case-insensitive English display name, profile id breaks ties. */
const byDisplayName = new Intl.Collator("en", { sensitivity: "accent" });

function compareSummaries(a: PublicMentorSummaryDto, b: PublicMentorSummaryDto): number {
  const byName = byDisplayName.compare(a.displayName, b.displayName);
  // Profile ids are unique, so the tie-break never returns 0.
  return byName !== 0 ? byName : a.id < b.id ? -1 : 1;
}

function values(input: MentorProfileInput) {
  return {
    area: input.area,
    description: input.description,
    publicWorkLinks: input.publicWorkLinks,
    price25Cents: toCents(input.price25Dollars),
    price50Cents: toCents(input.price50Dollars),
  };
}

/** Profile persistence and Phase 1's single source of public visibility/setup state. */
export class MentorProfileService {
  private readonly em: EntityManager;
  private readonly clock: Cradle["clock"];

  constructor({ em, clock }: { em: EntityManager; clock: Cradle["clock"] }) {
    this.em = em;
    this.clock = clock;
  }

  async getOwn(principal: Principal): Promise<MentorProfileDto | null> {
    const profile = await this.em.findOne(MentorProfile, { user: principal.userId });
    return profile ? toDto(profile) : null;
  }

  /** First save inserts; later saves replace. A concurrent first insert retries as an update. */
  async save(principal: Principal, input: MentorProfileInput): Promise<MentorProfileDto> {
    try {
      return toDto(await this.#saveTransaction(principal.userId, input));
    } catch (error) {
      if (!(error instanceof UniqueConstraintViolationException)) throw error;
      return toDto(await this.#saveTransaction(principal.userId, input));
    }
  }

  async getPublic(profileId: string): Promise<PublicMentorProfileDto> {
    const parsedId = mentorProfileIdSchema.safeParse(profileId);
    if (!parsedId.success) throw new NotFoundError("Mentor profile not found");
    const profile = await this.em.findOne(MentorProfile, { id: parsedId.data }, { populate: ["user"] });
    if (!profile) throw new NotFoundError("Mentor profile not found");
    const mentorRole = await this.em.findOne(UserRole, { user: profile.user.id, role: "mentor" });
    if (!mentorRole) throw new NotFoundError("Mentor profile not found");
    const payout = await this.em.findOne(PayoutAccount, { mentorProfile: profile.id });
    // The two 404s above already proved the profile and the current mentor role.
    return { ...toDto(profile), displayName: profile.user.name, bookable: this.#bookable(true, true, payout) };
  }

  /**
   * The public listing (E03): every bookable mentor, optionally narrowed to one area.
   * Independent of slot count — a ready mentor with no times is still listed.
   * Roles and payout accounts are read in two set-based queries, because the
   * entities carry no inverse relations and a per-card lookup would be an N+1.
   */
  async listBookable(area?: MentorArea): Promise<PublicMentorSummaryDto[]> {
    const profiles = await this.em.find(MentorProfile, area ? { area } : {}, { populate: ["user"] });
    if (profiles.length === 0) return [];
    const [roles, payouts] = await Promise.all([
      this.em.find(UserRole, { user: { $in: profiles.map((profile) => profile.user.id) }, role: "mentor" }),
      this.em.find(PayoutAccount, { mentorProfile: { $in: profiles.map((profile) => profile.id) } }),
    ]);
    const mentors = new Set(roles.map((role) => role.user.id));
    const payoutByProfile = new Map(payouts.map((payout) => [payout.mentorProfile.id, payout]));
    return profiles
      .filter((profile) => this.#bookable(true, mentors.has(profile.user.id), payoutByProfile.get(profile.id) ?? null))
      .map((profile) => ({
        id: profile.id,
        displayName: profile.user.name,
        area: profile.area,
        descriptionExcerpt: excerpt(profile.description),
      }))
      .sort(compareSummaries);
  }

  async getSetup(principal: Principal): Promise<MentorSetupDto> {
    const profile = await this.getOwn(principal);
    const payout = profile ? await this.em.findOne(PayoutAccount, { mentorProfile: profile.id }) : null;
    const slots = profile ? await this.em.find(AvailabilitySlot, { mentorProfile: profile.id, startsAt: { $gt: this.clock.now() } }) : [];
    const booked = slots.filter((slot) => slot.bookedAt !== null).length;
    return {
      profile,
      payout: payout ? { status: payout.status, country: payout.country, provisioningState: payout.provisioningState } : { status: "not_started", country: null, provisioningState: null },
      upcomingSlots: { open: slots.length - booked, booked },
      bookable: this.#bookable(!!profile, principal.roles.includes("mentor"), payout),
      publicUrl: profile ? `/mentors/${profile.id}` : null,
    };
  }

  /** A saved profile, current mentor role and ready provisioned payout are all required. */
  async isBookable(profileId: string): Promise<boolean> {
    const profile = await this.em.findOne(MentorProfile, { id: profileId }, { populate: ["user"] });
    if (!profile) return false;
    const role = await this.em.findOne(UserRole, { user: profile.user.id, role: "mentor" });
    if (!role) return false;
    const payout = await this.em.findOne(PayoutAccount, { mentorProfile: profile.id });
    return this.#bookable(true, true, payout);
  }

  /**
   * E02 MD7 in one place: `getPublic`, `getSetup`, `isBookable` and `listBookable`
   * all decide bookability here, so the public listing and the profile can never
   * disagree. Callers pass what they already established about the profile and the
   * current mentor role; this method owns the payout rule.
   */
  #bookable(hasProfile: boolean, hasMentorRole: boolean, payout: Pick<PayoutAccount, "provisioningState" | "status"> | null): boolean {
    return hasProfile && hasMentorRole && payout?.provisioningState === "provisioned" && payout.status === "ready";
  }

  async #saveOnce(em: EntityManager, userId: string, input: MentorProfileInput): Promise<MentorProfile> {
    let profile = await em.findOne(MentorProfile, { user: userId });
    const next = values(input);
    if (profile) {
      Object.assign(profile, next);
    } else {
      profile = em.create(MentorProfile, { user: em.getReference(User, userId), ...next });
      em.persist(profile);
    }
    await em.flush();
    return profile;
  }

  #saveTransaction(userId: string, input: MentorProfileInput): Promise<MentorProfile> {
    return this.em.transactional((em) => this.#saveOnce(em, userId, input), { clear: true });
  }
}
