import { describe, expect, it } from "vitest";
import { processPrivateReplyOnce } from "./privateReplyFlow";

describe("private reply flow", () => {
  it("creates one delivery only when the same comment is received twice", async () => {
    let claimed = false;
    const sends: string[] = [];
    const deliveries: string[] = [];
    const claim = async () => {
      if (claimed) return null;
      claimed = true;
      return { commentId: "comment-123" };
    };

    const first = await processPrivateReplyOnce({
      claim,
      send: async event => { sends.push(event.commentId); return { messageId: "message-1" }; },
      markSent: async (event, result) => { deliveries.push(`${event.commentId}:${result.messageId}`); },
      markFailed: async () => { throw new Error("A successful delivery must not be marked failed"); },
    });
    const second = await processPrivateReplyOnce({
      claim,
      send: async event => { sends.push(event.commentId); return { messageId: "message-2" }; },
      markSent: async (event, result) => { deliveries.push(`${event.commentId}:${result.messageId}`); },
      markFailed: async () => undefined,
    });

    expect(first).toEqual({ status: "sent" });
    expect(second).toEqual({ status: "deduplicated" });
    expect(sends).toEqual(["comment-123"]);
    expect(deliveries).toEqual(["comment-123:message-1"]);
  });
});
