import { asFunction, Lifetime, type AppContainer } from "@devmentor/core";
import { MikroORM, type EntityManager } from "@mikro-orm/postgresql";

import config from "./config";

declare module "@devmentor/core" {
  interface Cradle {
    /** Process-wide ORM; owns the connection pool. */
    orm: MikroORM;
    /** Entity manager forked per container scope (i.e. per request). */
    em: EntityManager;
  }
}

export function registerDb(container: AppContainer): void {
  container.register({
    orm: asFunction(() => new MikroORM(config), {
      lifetime: Lifetime.SINGLETON,
      dispose: (orm) => orm.close(),
    }),
    em: asFunction(({ orm }) => orm.em.fork(), { lifetime: Lifetime.SCOPED }),
  });
}
