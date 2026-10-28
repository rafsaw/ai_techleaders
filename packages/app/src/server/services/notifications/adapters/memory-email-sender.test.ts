import { describe, expect, it } from "vitest";

import { MemoryEmailSender } from "@/server/services/notifications/adapters/memory-email-sender";

describe("MemoryEmailSender", () => {
  it("records each sent message as a copy", async () => {
    const sender = new MemoryEmailSender();
    const message = { to: "ada@example.com", subject: "Hi", text: "Hello" };
    await sender.send(message);
    await sender.send({ ...message, html: "<p>Hello</p>" });
    message.subject = "changed";
    expect(sender.sent).toEqual([
      { to: "ada@example.com", subject: "Hi", text: "Hello" },
      { to: "ada@example.com", subject: "Hi", text: "Hello", html: "<p>Hello</p>" },
    ]);
  });

  it("rejects with failWith and records nothing until it is cleared", async () => {
    const sender = new MemoryEmailSender();
    const failure = new Error("smtp down");
    sender.failWith = failure;
    await expect(sender.send({ to: "ada@example.com", subject: "Hi", text: "Hello" })).rejects.toBe(failure);
    expect(sender.sent).toEqual([]);
    sender.failWith = undefined;
    await sender.send({ to: "ada@example.com", subject: "Hi", text: "Hello" });
    expect(sender.sent).toHaveLength(1);
  });
});
