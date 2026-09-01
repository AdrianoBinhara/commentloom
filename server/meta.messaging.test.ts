import { afterEach, describe, expect, it, vi } from "vitest";
import { encryptToken, getInstagramCommentDetails, listInstagramReels, replyToInstagramComment, sendPrivateReply } from "./meta";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

describe("Instagram media and confirmation messages", () => {
  it("sends the private invitation with a single confirmation quick reply and no destination link", async () => {
    process.env.JWT_SECRET = "test-session-secret";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ recipient_id: "commenter-1", message_id: "invite-1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendPrivateReply({
      instagramUserId: "ig-1",
      encryptedAccessToken: encryptToken("access-token"),
      commentId: "comment-1",
      message: "Quer que eu envie o material?",
      quickReplies: [{ title: "Quero o link", payload: "commentloom:confirm:single-use" }],
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      recipient: { comment_id: "comment-1" },
      message: {
        text: "Quer que eu envie o material?",
        quick_replies: [{ content_type: "text", title: "Quero o link", payload: "commentloom:confirm:single-use" }],
      },
    });
    expect(String(init.body)).not.toContain("https://");
  });

  it("returns only Reels from the connected professional account media edge", async () => {
    process.env.JWT_SECRET = "test-session-secret";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [
      { id: "reel-1", media_product_type: "REELS", caption: "Meu Reel", thumbnail_url: "https://cdn.example/reel.jpg", permalink: "https://instagram.com/reel/one", timestamp: "2026-08-28T12:00:00+0000" },
      { id: "feed-1", media_product_type: "FEED", caption: "Meu post" },
    ] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const reels = await listInstagramReels({ instagramUserId: "ig-1", encryptedAccessToken: encryptToken("access-token") });

    expect(reels).toEqual([{ id: "reel-1", caption: "Meu Reel", thumbnailUrl: "https://cdn.example/reel.jpg", permalink: "https://instagram.com/reel/one", mediaUrl: null, timestamp: "2026-08-28T12:00:00+0000" }]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/ig-1/media");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("media_product_type");
  });

  it("loads a comment timestamp from the comment node when a webhook omits it", async () => {
    process.env.JWT_SECRET = "test-session-secret";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      id: "comment-1",
      text: "quero",
      timestamp: "2026-08-28T15:10:00+0000",
      from: { id: "commenter-1" },
      media: { id: "reel-1" },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const comment = await getInstagramCommentDetails({ commentId: "comment-1", encryptedAccessToken: encryptToken("access-token") });

    expect(comment).toEqual({ commentText: "quero", commenterId: "commenter-1", reelId: "reel-1", createdAt: new Date("2026-08-28T15:10:00+0000") });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/comment-1");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("timestamp");
  });

  it("replies publicly to the matching Instagram comment with the configured message", async () => {
    process.env.JWT_SECRET = "test-session-secret";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "public-reply-1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await replyToInstagramComment({ commentId: "comment-1", encryptedAccessToken: encryptToken("access-token"), message: "Te mandei uma mensagem. Confira sua DM!" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/comment-1/replies");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ message: "Te mandei uma mensagem. Confira sua DM!" });
  });
});
