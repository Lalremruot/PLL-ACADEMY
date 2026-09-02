import type {
  PlayerFootballStats,
  PlayerPosition,
  Subscription,
} from '../types';

export function positionLabel(pos: PlayerPosition): string {
  const labels: Record<PlayerPosition, string> = {
    ST: 'Striker',
    LW: 'Left Winger',
    RW: 'Right Winger',
    CM: 'Central Midfielder',
    CDM: 'Defensive Midfielder',
    CB: 'Centre Back',
    LB: 'Left Back',
    RB: 'Right Back',
    GK: 'Goalkeeper',
  };
  return labels[pos];
}

/**
 * Returns the recorded performance stats for a player, or null when the coach
 * has not entered any yet. Never fabricates dummy data — a player with no real
 * stats shows the "no statistics yet" empty state instead of invented figures.
 */
export function getPlayerStats(subscription: Subscription): PlayerFootballStats | null {
  return subscription.footballStats ?? null;
}

export function computeAttendanceRate(
  records: { status: string }[]
): { present: number; late: number; absent: number; excused: number; rate: number } {
  const counts = { present: 0, late: 0, absent: 0, excused: 0 };
  for (const r of records) {
    if (r.status === 'Present') counts.present++;
    else if (r.status === 'Late') counts.late++;
    else if (r.status === 'Absent') counts.absent++;
    else if (r.status === 'Excused') counts.excused++;
  }
  const total = counts.present + counts.late + counts.absent + counts.excused;
  const rate = total > 0 ? Math.round(((counts.present + counts.late) / total) * 100) : 0;
  return { ...counts, rate };
}
