// Runs setup steps in order: a step whose check returns a reason is skipped,
// otherwise its action runs. Stops at the first failure.
export function runSetup(steps, ctx, log) {
  for (const step of steps) {
    try {
      const skipReason = step.check(ctx);
      if (skipReason) {
        log(`↷ ${step.name} — skipped (${skipReason})`);
        continue;
      }
      step.action(ctx);
      log(`✔ ${step.name} — done`);
    } catch (error) {
      const fix = error.fix ?? "see the output above and re-run npm run setup";
      log(`✖ ${step.name} — failed: ${error.message} → ${fix}`);
      return 1;
    }
  }
  log("Next: npm run dev");
  return 0;
}
