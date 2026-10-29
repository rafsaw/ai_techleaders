import { asFunction, asValue, Lifetime, type AppContainer } from "./di/container";
import { createConsoleLogger, type Logger } from "./logger";
import { systemClock, type Clock } from "./time/clock";

declare module "./di/container" {
  interface Cradle {
    /** Process-wide logger; redacts secrets from log context. */
    logger: Logger;
    /** Process-wide source of "now"; tests register `fixedClock` instead. */
    clock: Clock;
  }
}

export function registerCore(container: AppContainer): void {
  container.register({
    logger: asFunction(createConsoleLogger, { lifetime: Lifetime.SINGLETON }),
    clock: asValue(systemClock),
  });
}
