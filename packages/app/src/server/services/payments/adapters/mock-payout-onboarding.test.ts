import { expect, it } from "vitest";
import { MockPayoutOnboarding } from "@/server/services/payments/adapters/mock-payout-onboarding";

it("simulates stable account creation, listing, fetch, links and webhook validation", async () => {
  const mock = new MockPayoutOnboarding();
  const input = { country: "US" as const, idempotencyKey: "key", payoutAccountId: "p1", mentorProfileId: "m1" };
  const first = await mock.createAccount(input);
  expect(await mock.createAccount(input)).toEqual(first);
  expect((await mock.createAccount({ ...input, idempotencyKey: "other" })).accountId).not.toBe(first.accountId);
  expect(await mock.findAccounts(input)).toHaveLength(2);
  expect(await mock.findAccounts({ ...input, mentorProfileId: "other" })).toHaveLength(0);
  expect(await mock.fetchAccount(first.accountId)).toMatchObject({ status: "incomplete" });
  await expect(mock.fetchAccount("missing")).rejects.toMatchObject({ status: 502 });
  expect((await mock.createOnboardingLink(first.accountId)).origin).toBe("https://connect.stripe.com");
  await expect(mock.createOnboardingLink("missing")).rejects.toMatchObject({ status: 502 });
  expect(mock.parseWebhook('{"id":"evt","type":"account.updated","accountId":null}', "mock-signature")).toEqual({ id: "evt", type: "account.updated", accountId: null });
  for (const body of ["bad", "null", "{}", '{"id":1}', '{"id":"a","type":1}', '{"id":"a","type":"b"}', '{"id":"a","type":"b","accountId":1}']) expect(() => mock.parseWebhook(body, "mock-signature")).toThrowError(expect.objectContaining({ status: 400 }));
  expect(() => mock.parseWebhook("{}", null)).toThrowError(expect.objectContaining({ status: 400 }));
});
