import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => new URL(`../${path}`, import.meta.url);

describe("CommentLoom brand surfaces", () => {
  it("uses CommentLoom consistently without hardcoding an installation domain", async () => {
    const [html, layout, setupPage, setupGuide, credentialsGuide] = await Promise.all([
      readFile(projectFile("client/index.html"), "utf8"),
      readFile(projectFile("client/src/components/DashboardLayout.tsx"), "utf8"),
      readFile(projectFile("client/src/pages/Setup.tsx"), "utf8"),
      readFile(projectFile("SETUP.md"), "utf8"),
      readFile(projectFile("META_CREDENTIALS_GUIDE.md"), "utf8"),
    ]);
    expect(html).toContain("CommentLoom — automações para Reels");
    expect(layout).toContain("COMMENTLOOM");
    expect(layout).not.toContain("REPLYLINE");
    expect(setupPage).not.toContain("commentloom.com");
    expect(setupGuide).toContain("https://app.seu-dominio.example/api/meta/oauth/callback");
    expect(setupGuide).toContain("https://app.seu-dominio.example/api/meta/webhook");
    expect(credentialsGuide).toContain("PUBLIC_BASE_URL");
  });
});
