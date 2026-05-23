export const summaryCache = new Map<string, { data: unknown; expires: number }>();

export function invalidateSummaryCache(): void {
  summaryCache.clear();
}
