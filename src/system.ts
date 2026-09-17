/** Host-system observations; not oMLX process telemetry or memory pressure. */
export type SystemSnapshot = {
  platform: string;
  cpuPercent: number | null;
  memoryUsedGB: number | null;
  memoryTotalGB: number | null;
  sampledAt: number;
};

export const parseSystemSnapshot = (value: unknown): SystemSnapshot | null => {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const number = (key: string): number | null => (
    typeof data[key] === 'number' && Number.isFinite(data[key]) && data[key] >= 0 ? data[key] as number : null
  );
  const sampledAt = number('sampledAt');
  if (typeof data.platform !== 'string' || sampledAt === null) return null;
  return {
    platform: data.platform === 'darwin' ? 'macOS' : 'Host',
    cpuPercent: number('cpuPercent') === null ? null : Math.min(100, number('cpuPercent')!),
    memoryUsedGB: number('memoryUsedGB'),
    memoryTotalGB: number('memoryTotalGB'),
    sampledAt,
  };
};
