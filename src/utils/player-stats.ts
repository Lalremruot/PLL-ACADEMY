import type {
  PlayerFootballStats,
  PlayerPosition,
  Subscription,
} from '../types';

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function seededRange(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  const frac = x - Math.floor(x);
  return Math.round(min + frac * (max - min));
}

export function inferPositionFromCourse(courseName: string): PlayerPosition {
  const lower = courseName.toLowerCase();
  if (lower.includes('striker') || lower.includes('finishing')) return 'ST';
  if (lower.includes('midfield') || lower.includes('passing')) return 'CM';
  if (lower.includes('goalkeep')) return 'GK';
  if (lower.includes('defensive') || lower.includes('backline')) return 'CB';
  if (lower.includes('fitness') || lower.includes('agility')) return 'LW';
  return 'CM';
}

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

/** Generates plausible academy-season stats when none are stored on the subscription. */
export function generatePlayerStats(subscription: Subscription): PlayerFootballStats {
  const seed = hashSeed(subscription.id + subscription.studentName);
  const position = inferPositionFromCourse(subscription.courseName);
  const isGk = position === 'GK';
  const isDef = position === 'CB' || position === 'LB' || position === 'RB';
  const isStriker = position === 'ST' || position === 'LW' || position === 'RW';

  const base = subscription.tier === 'Premium' ? 72 : 65;
  const ageBoost = subscription.age ? Math.min(8, Math.max(0, subscription.age - 10)) : 4;

  const attributes = {
    pace: seededRange(seed + 1, base - 5, base + ageBoost + 8),
    shooting: seededRange(seed + 2, isGk ? 25 : base - 8, isStriker ? base + 15 : base + 2),
    passing: seededRange(seed + 3, base - 10, base + 12),
    dribbling: seededRange(seed + 4, base - 12, isStriker ? base + 14 : base + 4),
    defending: seededRange(seed + 5, isDef || isGk ? base + 5 : base - 15, base + 10),
    physical: seededRange(seed + 6, base - 5, base + ageBoost + 6),
  };

  const overallRating = Math.round(
    (attributes.pace +
      attributes.shooting +
      attributes.passing +
      attributes.dribbling +
      attributes.defending +
      attributes.physical) /
      6
  );

  const appearances = seededRange(seed + 7, 14, 28);
  const goals = isGk ? 0 : seededRange(seed + 8, isStriker ? 6 : 0, isStriker ? 18 : 5);
  const assists = isGk ? 0 : seededRange(seed + 9, 1, isStriker ? 8 : 12);

  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const form = months.map((month, i) => ({
    month,
    rating: seededRange(seed + 20 + i, 62, 88) / 10,
    goals: isGk ? 0 : seededRange(seed + 30 + i, 0, 3),
    assists: isGk ? 0 : seededRange(seed + 40 + i, 0, 2),
  }));

  const opponents = [
    'City Youth FC',
    'Northside United',
    'Academy Select XI',
    'Riverside Rovers',
    'Capital Eagles',
    'Metro Lions',
  ];

  const recentMatches = opponents.slice(0, 5).map((opponent, i) => {
    const gf = seededRange(seed + 50 + i, 0, 4);
    const ga = seededRange(seed + 60 + i, 0, 3);
    const won = gf >= ga;
    return {
      date: `2026-${String(Math.max(1, 3 - Math.floor(i / 2))).padStart(2, '0')}-${String(Math.max(1, 22 - i * 3)).padStart(2, '0')}`,
      opponent,
      competition: i % 2 === 0 ? 'League' : 'Cup',
      result: `${gf}-${ga} ${won ? 'W' : gf === ga ? 'D' : 'L'}`,
      goals: isGk ? 0 : seededRange(seed + 70 + i, 0, 2),
      assists: isGk ? 0 : seededRange(seed + 80 + i, 0, 1),
      rating: seededRange(seed + 90 + i, 65, 92) / 10,
      minutes: seededRange(seed + 100 + i, 45, 90),
    };
  });

  return {
    position,
    preferredFoot: seededRange(seed + 110, 0, 2) === 0 ? 'Left' : 'Right',
    jerseyNumber: seededRange(seed + 111, 1, 99),
    overallRating,
    attributes,
    season: {
      appearances,
      goals,
      assists,
      minutesPlayed: appearances * seededRange(seed + 112, 55, 78),
      yellowCards: seededRange(seed + 113, 0, 4),
      redCards: seededRange(seed + 114, 0, 1),
      passAccuracy: seededRange(seed + 115, 68, 92),
      shotAccuracy: isGk ? 0 : seededRange(seed + 116, 42, 78),
      tacklesWon: seededRange(seed + 117, 8, 45),
      interceptions: seededRange(seed + 118, 5, 38),
      ...(isGk
        ? {
            cleanSheets: seededRange(seed + 119, 3, 10),
            saves: seededRange(seed + 120, 40, 120),
          }
        : {}),
    },
    form,
    recentMatches,
  };
}

export function getPlayerStats(subscription: Subscription): PlayerFootballStats {
  return subscription.footballStats ?? generatePlayerStats(subscription);
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
