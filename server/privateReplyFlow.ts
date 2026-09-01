export async function processPrivateReplyOnce<TEvent, TResult>(input: {
  claim: () => Promise<TEvent | null>;
  send: (event: TEvent) => Promise<TResult>;
  markSent: (event: TEvent, result: TResult) => Promise<void>;
  markFailed: (event: TEvent, error: unknown) => Promise<void>;
}) {
  const event = await input.claim();
  if (!event) return { status: "deduplicated" } as const;
  try {
    const result = await input.send(event);
    await input.markSent(event, result);
    return { status: "sent" } as const;
  } catch (error) {
    await input.markFailed(event, error);
    return { status: "failed" } as const;
  }
}
