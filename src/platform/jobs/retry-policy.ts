export function outboxRetryDelayMs(attemptNumber: number) {
  const normalized = Math.max(1, attemptNumber);
  return Math.min(15 * 60_000, 1_000 * (2 ** Math.min(normalized - 1, 10)));
}
