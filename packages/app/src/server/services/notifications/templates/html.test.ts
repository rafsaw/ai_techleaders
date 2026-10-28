import { describe, expect, it } from "vitest";

import { escapeHtml } from "@/server/services/notifications/templates/html";

describe("escapeHtml", () => {
  it("escapes every character that can break out of text or a quoted attribute", () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe("&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("Ada Lovelace")).toBe("Ada Lovelace");
  });
});
