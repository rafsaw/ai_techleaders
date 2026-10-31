# @devmentor/db

MikroORM config, entities, migrations, DB registrations.

## Configuration

- `src/config.ts` is the runtime config, shared by the app and the CLI.
- `mikro-orm.config.ts` is the CLI entry. It loads `.env*` from `packages/app`,
  the same files Next.js reads.
- Settings come from env vars: `DATABASE_URL`, `DB_POOL_MIN`, `DB_POOL_MAX`
  and `DB_DEBUG`. Never hard-code credentials.
- **New MikroORM packages** must be added to `serverExternalPackages` in
  `packages/app/next.config.ts`. Next's built-in list only knows the v6
  package names.
- MikroORM v7 is ESM-only and needs Node ≥ 22.17. The CLI runs TypeScript
  through `tsx`, which it auto-detects. Don't add `ts-node`.

## Entities

- Define entities with `defineEntity` + `p` and a class
  (`class X extends XSchema.class {}` then `XSchema.setClass(X)`).
- Don't use decorators or `reflect-metadata`. SWC/Turbopack don't emit
  decorator metadata.
- Spread `baseProperties` (uuid `id`, `createdAt`, `updatedAt`) into every
  entity.
- Name files `*.entity.ts` under `src/entities/`.
- List every entity in the `entities` array in `src/entities/index.ts`.
  There's no folder discovery.
- Restart `next dev` after changing entity definitions. The ORM is cached
  per process and won't see HMR'd entity metadata.

## Seeders

Seeders live in `src/seeders/` and must be listed in `seeder.seedersList` in
`src/config.ts`. Without the list, `seeder:run` imports every file in that
folder, colocated tests included.

## Entity manager

- Use the scoped `em` from a container scope (a fork).
- Never use `orm.em` (the global EM) for request work.
- v7 has no `persistAndFlush`. Use `em.persist(x).flush()`.

## Schema changes go through migrations only

- Change the entity, run `npm run db:migration:create`, review the generated
  file in `src/migrations/`, commit it, and apply it with `npm run db:migrate`.
- Never use `schema:update` or `schema:fresh` against shared databases.
- Never edit a migration that has already been applied. Write a new one.
- Migration tests live one directory above `src/migrations/` so the MikroORM
  CLI cannot discover them as migrations.

## Single-use tokens (P9)

Link tables spread `singleUseTokenProperties` (`src/entities/single-use-token.ts`)
and use `inspectSingleUseToken` / `consumeSingleUseToken` from `@devmentor/db`.
They report `valid | consumed | invalid | expired | used`, so pages can say why.
A GET page only **inspects**; consume runs in a POST, inside the transaction
that applies its effect. Store only the hash; the raw token travels in the
link's query string and the POST body.
