import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => new URL(`../${path}`, import.meta.url);

describe("CommentLoom brand surfaces", () => {
  it("uses CommentLoom consistently without hardcoding an installation domain", async () => {
    const [html, layout, setupPage, setupGuide] = await Promise.all([
      readFile(projectFile("client/index.html"), "utf8"),
      readFile(projectFile("client/src/components/DashboardLayout.tsx"), "utf8"),
      readFile(projectFile("client/src/pages/Setup.tsx"), "utf8"),
      readFile(projectFile("../docs/CONFIGURAR_META.md"), "utf8"),
    ]);
    expect(html).toContain("CommentLoom — automações para Reels");
    expect(layout).toContain("COMMENTLOOM");
    expect(layout).not.toContain("REPLYLINE");
    expect(setupPage).not.toContain("commentloom.com");
    expect(setupGuide).toContain("https://app.exemplo.com/api/meta/oauth/callback");
    expect(setupGuide).toContain("https://app.exemplo.com/api/meta/webhook");
    expect(setupGuide).toContain("PUBLIC_BASE_URL");
  });
});
