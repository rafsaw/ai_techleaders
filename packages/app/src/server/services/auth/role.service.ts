import { ValidationError, type Cradle } from "@devmentor/core";
import { ROLES, type Role } from "@devmentor/core/validators/auth/role.schema";
import { UserRole, type EntityManager, type MentorInvitation, type User } from "@devmentor/db";

/**
 * Roles the generic grant may add. `mentor` comes only from accepting an
 * email-bound invitation (accounts AD5, Phase 3), never from a plain grant.
 */
export type GrantableRole = Exclude<Role, "mentor">;

/** Roles in their canonical order, so DTOs and principals are deterministic. */
export function sortRoles(roles: Iterable<Role>): Role[] {
  return [...new Set(roles)].sort((a, b) => ROLES.indexOf(a) - ROLES.indexOf(b));
}

/**
 * Decides what a person may do. Role changes touch only `user_roles`: no
 * session is deleted or rotated, and sessions read roles live, so a change
 * applies on the user's next request (accounts AD2).
 */
export class RoleService {
  private readonly em: EntityManager;

  constructor({ em }: Pick<Cradle, "em">) {
    this.em = em;
  }

  /** The user's current roles, read from the database (never cached). */
  async rolesOf(userId: string): Promise<Role[]> {
    const rows = await this.em.find(UserRole, { user: userId });
    return sortRoles(rows.map((row) => row.role));
  }

  /**
   * Idempotently grants `role`. Returns `true` when it was added and `false`
   * when the user already held it. A concurrent grant of the same role is
   * absorbed by the unique `(user_id, role)` constraint.
   */
  async grant(userId: string, role: GrantableRole): Promise<boolean> {
    // The type excludes mentor; this guards untyped callers too.
    if ((role as Role) === "mentor") {
      throw new ValidationError(
        { role: ["The mentor role is granted only by accepting an invitation"] },
        "The mentor role is granted only by accepting an invitation",
      );
    }
    if ((await this.em.count(UserRole, { user: userId, role })) > 0) return false;
    await this.em.upsert(
      UserRole,
      { user: userId, role },
      { onConflictFields: ["user", "role"], onConflictAction: "ignore" },
    );
    return true;
  }

  /**
   * Grants `mentor` from an accepted invitation (accounts Flow 3 step 4, AD5):
   * the only way to the mentor role. `MentorInvitationService.accept` calls it
   * inside its transaction (`em`) after locking the user, then the invitation,
   * re-checking both and consuming the invitation for this user. The row
   * records `invitation_id` (allowed only on mentor by
   * `user_roles_invitation_mentor_check`) and leaves every other role alone.
   * Anything but that validated path is a programming error, refused here.
   */
  grantMentorFromInvitation(em: EntityManager, { user, invitation }: { user: User; invitation: MentorInvitation }): void {
    if (!em.isInTransaction()) throw new Error("The mentor role is granted only inside the invitation acceptance transaction");
    const accepted =
      invitation.consumedAt != null &&
      invitation.revokedAt == null &&
      invitation.acceptedBy?.id === user.id &&
      invitation.email === user.email &&
      user.emailConfirmedAt != null;
    if (!accepted) throw new Error("The mentor role is granted only from an invitation this verified account accepted");
    em.persist(em.create(UserRole, { user, role: "mentor", invitation }));
  }

  /** Idempotently removes `operator`. Returns `true` when a role was removed. */
  async revokeOperator(userId: string): Promise<boolean> {
    return (await this.em.nativeDelete(UserRole, { user: userId, role: "operator" })) > 0;
  }
}
