import { createRequire } from "node:module";
const require = createRequire("/home/rafal/projects/ai_techleaders/package.json");
const { chromium } = require("playwright");
const url = "file://" + new URL("../../index.html", import.meta.url).pathname;
const out = process.argv[2] || "";
let fails = 0;
const ok = (c, m, extra = "") => { console.log((c ? "PASS " : "FAIL ") + m + (extra ? " | observed: " + extra : "")); if (!c) fails++; };
const b = await chromium.launch();
async function toStripeChecking(p, checkResult) {
  await p.goto(url); await p.click("#reset");
  if (checkResult) await p.evaluate((v) => { document.getElementById("t-stripe-check").value = v; }, checkResult);
  await p.click("text=Open the invitation link");
  await p.getByRole("button", { name: "Sign in", exact: true }).click();
  await p.getByRole("button", { name: "Continue with GitHub" }).click();
  await p.getByRole("button", { name: /Accept as Ada/ }).click();
  await p.getByRole("link", { name: "Mentor setup" }).first().click();
  await p.getByRole("link", { name: "Create your profile" }).click();
  await p.getByLabel("Area").selectOption("react");
  await p.getByLabel("Description").fill("React and TypeScript.");
  await p.getByLabel("Links to public work").fill("https://example.test/a");
  await p.getByLabel("Price for 25 minutes").fill("30");
  await p.getByLabel("Price for 50 minutes").fill("55");
  await p.getByRole("button", { name: "Save profile" }).click();
  await p.getByRole("link", { name: "Set up payouts" }).click();
  await p.getByLabel("Country").selectOption("Poland");
  await p.getByRole("button", { name: "Continue to Stripe" }).click();
  await p.getByRole("button", { name: "Submit my details" }).click(); await p.getByRole("button", { name: "Check status" }).waitFor();
}
const text = async (p) => (await p.locator("body").innerText()).replace(/\s+/g, " ");
const noticeText = (p) => p.locator("#notices").innerText();
// A: checking -> bookable
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await toStripeChecking(p);
  let n = await noticeText(p);
  { const t0 = await text(p); ok(/Stripe is checking your details/.test(n) && /Stripe is checking/.test(t0), "A1 checking state shows checking", n + " /// " + t0.slice(t0.indexOf("Mentor setup"), t0.indexOf("Mentor setup") + 300)); }
  ok(!/You are bookable/.test(await text(p)), "A1 no bookable claim while checking");
  if (out) await p.screenshot({ path: out + "/F01-checking.png", fullPage: true });
  await p.getByRole("button", { name: "Check status" }).click();
  await p.waitForSelector("text=Payouts confirmed");
  const t = await text(p); n = await noticeText(p);
  ok(/You are bookable/.test(t) && /Payouts confirmed/.test(t), "A2 after check: bookable + payouts confirmed");
  ok(!/Stripe is checking/.test(t) && !/Stripe is checking/.test(n), "A3 no 'Stripe is checking' anywhere once confirmed", "notices=[" + n.trim() + "]");
  ok(await p.locator("[role=status]").filter({ hasText: /checking/i }).count() === 0, "A4 no stale checking status region");
  if (out) await p.screenshot({ path: out + "/F02-bookable-after-check.png", fullPage: true });
  const stages = await p.locator("ol li").allInnerTexts();
  ok(/Stripe/.test(stages.join("|")), "A5 stepper present", stages.join("|").replace(/\s+/g, " "));
  await p.close();
}
// B: checking -> blocked
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await toStripeChecking(p, "blocked");
  await p.getByRole("button", { name: "Check status" }).click();
  await p.waitForSelector("text=Blocked: Stripe cannot enable payouts");
  const t = await text(p); const n = await noticeText(p);
  ok(!/Stripe is checking/.test(t) && !/Stripe is checking/.test(n), "B1 blocked: no 'Stripe is checking'", "notices=[" + n.trim() + "]");
  ok(/Not bookable yet/.test(t) && !/You are bookable/.test(t), "B2 blocked: not bookable");
  ok(await p.getByRole("button", { name: "Contact the DevMentor team" }).count() === 1, "B3 blocked: contact action present");
  if (out) await p.screenshot({ path: out + "/F03-blocked.png", fullPage: true });
  await p.close();
}
// C: leaving mentor setup and coming back after confirmation does not resurrect the banner
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await toStripeChecking(p);
  await p.getByRole("button", { name: "Check status" }).click();
  await p.waitForSelector("text=Payouts confirmed");
  await p.getByRole("link", { name: "Publish slots" }).click();
  await p.getByRole("heading", { name: "Slots" }).waitFor(); await p.getByRole("link", { name: "Back to Mentor setup" }).click(); await p.getByRole("heading", { name: "Mentor setup" }).first().waitFor(); await p.waitForTimeout(200);
  const t = await text(p); const n = await noticeText(p);
  ok(/You are bookable/.test(t) && !/checking/i.test(n), "C1 round trip keeps clean status", t.slice(0,500));
  await p.close();
}
await b.close();
console.log(fails ? `FAILED ${fails}` : "ALL PASSED");
process.exit(fails ? 1 : 0);
