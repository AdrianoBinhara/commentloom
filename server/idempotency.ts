export async function processClaimedOnce<T>(
  claim: () => Promise<T | null>,
  process: (claim: T) => Promise<void>,
) {
  const claimed = await claim();
  if (!claimed) return { processed: false } as const;
  await process(claimed);
  return { processed: true } as const;
}
