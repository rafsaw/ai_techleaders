import { ValidationError, type Cradle } from "@devmentor/core";
import { ROLES, type Role } from "@devmentor/core/validators/auth/role.schema";
import { UserRole, type EntityManager } from "@devmentor/db";

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

  /** Idempotently removes `operator`. Returns `true` when a role was removed. */
  async revokeOperator(userId: string): Promise<boolean> {
    return (await this.em.nativeDelete(UserRole, { user: userId, role: "operator" })) > 0;
  }
}
