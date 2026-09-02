'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Calendar,
  Crosshair,
  Footprints,
  Shield,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import type { StudentAttendanceRecord, Subscription } from '../../types';
import {
  computeAttendanceRate,
  getPlayerStats,
  positionLabel,
} from '../../utils/player-stats';
import { apiFetchStudentAttendanceRange } from '../../services/apiClient';
import { formatDisplayDate } from '../../utils/attendance-dates';
import PlayerRadarChart from './PlayerRadarChart';
import PlayerFormChart from './PlayerFormChart';
import PlayerStatBar from './PlayerStatBar';

interface PlayerProfileStatsProps {
  subscription: Subscription;
}

function StatPill({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-3 rounded-xs border min-w-[72px] ${
        accent
          ? 'bg-brand-gold/10 border-brand-gold/40'
          : 'bg-brand-charcoal border-brand-border/50'
      }`}
    >
      <Icon className={`h-3.5 w-3.5 mb-1.5 ${accent ? 'text-brand-gold' : 'text-gray-500'}`} />
      <span className={`font-mono text-lg font-extrabold leading-none ${accent ? 'text-brand-gold' : 'text-white'}`}>
        {value}
      </span>
      <span className="font-mono text-[7px] uppercase tracking-wider text-gray-500 mt-1 text-center">
        {label}
      </span>
    </div>
  );
}

function RatingRing({ rating, size = 88 }: { rating: number; size?: number }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (rating / 99) * circ;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#D4AF37"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-extrabold text-brand-gold leading-none">{rating}</span>
        <span className="font-mono text-[7px] uppercase text-gray-500 tracking-widest mt-0.5">OVR</span>
      </div>
    </div>
  );
}

function AttendanceRing({ rate }: { rate: number }) {
  const size = 72;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (rate / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#2D6A4F"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-lg font-extrabold text-brand-emerald leading-none">{rate}%</span>
        <span className="font-mono text-[6px] uppercase text-gray-500 tracking-wider">Attend</span>
      </div>
    </div>
  );
}

export default function PlayerProfileStats({ subscription }: PlayerProfileStatsProps) {
  const stats = getPlayerStats(subscription);
  const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendanceRecord[]>([]);

  useEffect(() => {
    const to = new Date().toISOString().split('T')[0];
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 3);
    const from = fromDate.toISOString().split('T')[0];

    apiFetchStudentAttendanceRange({ from, to, studentId: subscription.id })
      .then(setAttendanceRecords)
      .catch(() => setAttendanceRecords([]));
  }, [subscription.id]);

  const attendance = computeAttendanceRate(attendanceRecords);
  const initials = subscription.studentName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="force-dark relative overflow-hidden rounded-xs border border-brand-border bg-gradient-to-br from-[#1a1818] via-brand-charcoal to-[#0d0c0c]">
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row gap-5 items-center md:items-center">
            <div className="relative shrink-0">
              <div className="w-24 h-28 rounded-xs overflow-hidden border-2 border-brand-border/40 bg-brand-surface-card">
                {subscription.profilePic ? (
                  <img
                    src={subscription.profilePic}
                    alt={subscription.studentName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-brand-surface-card to-[#141313]">
                    <span className="font-sans text-3xl font-bold text-brand-gold/40">{initials}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 text-center md:text-left min-w-0">
              <h3 className="font-sans text-2xl md:text-3xl font-extrabold text-white tracking-tight truncate">
                {subscription.studentName}
              </h3>
              <p className="font-sans text-sm text-brand-gold/90 mt-1 font-medium">{subscription.courseName}</p>
              <p className="font-sans text-xs text-gray-400 mt-2">No performance statistics recorded yet.</p>
            </div>
          </div>
        </div>

        <section className="bg-brand-surface-card border border-brand-border rounded-xs p-8 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-brand-charcoal border border-brand-border flex items-center justify-center mb-3">
            <Activity className="h-6 w-6 text-gray-500" />
          </div>
          <h4 className="font-sans text-sm font-bold text-white uppercase tracking-wider">No Match Statistics Yet</h4>
          <p className="font-sans text-xs text-gray-400 max-w-sm mt-1.5">
            Once a coach records matches, the player&apos;s rating, season form, and recent match log will appear here.
          </p>
        </section>
      </div>
    );
  }

  const isGk = stats.position === 'GK';

  return (
    <div className="space-y-6">
      {/* Hero player card */}
      <div className="force-dark relative overflow-hidden rounded-xs border border-brand-border bg-gradient-to-br from-[#1a1818] via-brand-charcoal to-[#0d0c0c]">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, #D4AF37 0, #D4AF37 1px, transparent 0, transparent 50%)',
            backgroundSize: '12px 12px',
          }}
        />
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6 md:p-8 flex flex-col lg:flex-row gap-8 items-center lg:items-stretch">
          {/* Photo + jersey */}
          <div className="relative shrink-0">
            <div className="w-44 h-52 md:w-48 md:h-56 rounded-xs overflow-hidden border-2 border-brand-gold/30 shadow-2xl shadow-brand-gold/10 bg-brand-charcoal">
              {subscription.profilePic ? (
                <img
                  src={subscription.profilePic}
                  alt={subscription.studentName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-brand-surface-card to-[#141313]">
                  <span className="font-sans text-5xl font-bold text-brand-gold/40">{initials}</span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-3 -right-3 w-14 h-14 rounded-xs bg-brand-gold flex items-center justify-center shadow-lg border-2 border-brand-charcoal">
              <span className="font-mono text-2xl font-black text-black">{stats.jerseyNumber}</span>
            </div>
          </div>

          {/* Identity */}
          <div className="flex-1 flex flex-col justify-center text-center lg:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-brand-gold bg-brand-gold/10 border border-brand-gold/30 px-2 py-0.5 rounded-xs">
                {stats.position}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                {positionLabel(stats.position)}
              </span>
              {subscription.batch && (
                <span className="font-mono text-[10px] text-gray-400">• {subscription.batch}</span>
              )}
            </div>

            <h3 className="font-sans text-3xl md:text-4xl font-extrabold text-white tracking-tight truncate">
              {subscription.studentName}
            </h3>

            <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-3 text-xs text-gray-400">
              {subscription.age !== undefined && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-gray-500" />
                  {subscription.age} yrs
                </span>
              )}
              {subscription.height !== undefined && (
                <span>{subscription.height} cm</span>
              )}
              {subscription.weight !== undefined && (
                <span>{subscription.weight} kg</span>
              )}
              <span className="flex items-center gap-1">
                <Footprints className="h-3.5 w-3.5 text-gray-500" />
                {stats.preferredFoot} foot
              </span>
            </div>

            <p className="font-sans text-sm text-brand-gold/90 mt-2 font-medium">{subscription.courseName}</p>
          </div>

          {/* OVR + attendance */}
          <div className="flex flex-row lg:flex-col items-center gap-6 shrink-0">
            <RatingRing rating={stats.overallRating} />
            <AttendanceRing rate={attendanceRecords.length > 0 ? attendance.rate : 0} />
          </div>
        </div>
      </div>

      {/* Season stat pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <StatPill label="Apps" value={stats.season.appearances} icon={Activity} accent />
        {!isGk && (
          <>
            <StatPill label="Goals" value={stats.season.goals} icon={Target} accent />
            <StatPill label="Assists" value={stats.season.assists} icon={Crosshair} />
          </>
        )}
        {isGk && (
          <>
            <StatPill label="Clean Sheets" value={stats.season.cleanSheets ?? 0} icon={Shield} accent />
            <StatPill label="Saves" value={stats.season.saves ?? 0} icon={Zap} />
          </>
        )}
        <StatPill label="Mins" value={stats.season.minutesPlayed} icon={TrendingUp} />
        <StatPill label="Pass %" value={`${stats.season.passAccuracy}%`} icon={Trophy} />
        {!isGk && <StatPill label="Shot %" value={`${stats.season.shotAccuracy}%`} icon={Target} />}
        <StatPill label="Tackles" value={stats.season.tacklesWon} icon={Shield} />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar */}
        <section className="lg:col-span-4 bg-brand-surface-card border border-brand-border rounded-xs p-5">
          <h4 className="font-sans text-xs font-bold text-white uppercase tracking-wider mb-1">
            Attribute Profile
          </h4>
          <p className="font-mono text-[9px] text-gray-500 mb-4">Academy scouting ratings (0–99)</p>
          <PlayerRadarChart attributes={stats.attributes} />
        </section>

        {/* Form trend */}
        <section className="lg:col-span-5 bg-brand-surface-card border border-brand-border rounded-xs p-5 flex flex-col">
          <h4 className="font-sans text-xs font-bold text-white uppercase tracking-wider mb-1">
            Season Form
          </h4>
          <p className="font-mono text-[9px] text-gray-500 mb-2">
            Gold line = match rating · Green bars = G+A per month
          </p>
          <div className="flex-1 min-h-[140px]">
            <PlayerFormChart form={stats.form} />
          </div>
        </section>

        {/* Detailed bars + training */}
        <section className="lg:col-span-3 bg-brand-surface-card border border-brand-border rounded-xs p-5 space-y-4">
          <h4 className="font-sans text-xs font-bold text-white uppercase tracking-wider">
            Performance Metrics
          </h4>
          <PlayerStatBar label="Pass Accuracy" value={stats.season.passAccuracy} suffix="%" highlight />
          {!isGk && (
            <PlayerStatBar label="Shot Accuracy" value={stats.season.shotAccuracy} suffix="%" />
          )}
          <PlayerStatBar label="Tackles Won" value={stats.season.tacklesWon} max={50} />
          <PlayerStatBar label="Interceptions" value={stats.season.interceptions} max={45} />
          <div className="pt-3 border-t border-brand-border/40 space-y-2">
            <p className="font-mono text-[9px] uppercase text-gray-500 tracking-wider">Training Attendance</p>
            <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
              <div>
                <p className="font-mono font-bold text-brand-emerald">{attendance.present}</p>
                <p className="text-gray-600">Present</p>
              </div>
              <div>
                <p className="font-mono font-bold text-yellow-500">{attendance.late}</p>
                <p className="text-gray-600">Late</p>
              </div>
              <div>
                <p className="font-mono font-bold text-brand-cinnabar">{attendance.absent}</p>
                <p className="text-gray-600">Absent</p>
              </div>
              <div>
                <p className="font-mono font-bold text-gray-400">{attendance.excused}</p>
                <p className="text-gray-600">Excused</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Recent matches */}
      <section className="bg-brand-surface-card border border-brand-border rounded-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
          <div>
            <h4 className="font-sans text-sm font-bold text-white uppercase tracking-wider">
              Recent Match Log
            </h4>
            <p className="font-mono text-[9px] text-gray-500 mt-0.5">Last 5 competitive appearances</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-brand-charcoal/60 font-mono text-[9px] uppercase tracking-wider text-gray-500">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Opponent</th>
                <th className="px-5 py-3">Comp</th>
                <th className="px-5 py-3">Result</th>
                <th className="px-5 py-3 text-center">G</th>
                <th className="px-5 py-3 text-center">A</th>
                <th className="px-5 py-3 text-center">Min</th>
                <th className="px-5 py-3 text-right">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {stats.recentMatches.map((m, i) => {
                const won = m.result.endsWith(' W');
                const draw = m.result.endsWith(' D');
                return (
                  <tr key={i} className="hover:bg-brand-charcoal/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-gray-400">{formatDisplayDate(m.date)}</td>
                    <td className="px-5 py-3 font-sans font-medium text-white">{m.opponent}</td>
                    <td className="px-5 py-3 font-mono text-gray-500">{m.competition}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded-xs ${
                          won
                            ? 'bg-brand-emerald/20 text-green-400'
                            : draw
                              ? 'bg-gray-500/20 text-gray-300'
                              : 'bg-brand-cinnabar/20 text-red-400'
                        }`}
                      >
                        {m.result}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center font-mono font-bold text-white">{m.goals}</td>
                    <td className="px-5 py-3 text-center font-mono text-gray-300">{m.assists}</td>
                    <td className="px-5 py-3 text-center font-mono text-gray-400">{m.minutes}&apos;</td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`font-mono font-extrabold ${
                          m.rating >= 8 ? 'text-brand-gold' : m.rating >= 7 ? 'text-white' : 'text-gray-400'
                        }`}
                      >
                        {m.rating.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
