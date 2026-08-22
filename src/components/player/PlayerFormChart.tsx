'use client';

import React from 'react';
import type { PlayerMonthlyForm } from '../../types';

interface PlayerFormChartProps {
  form: PlayerMonthlyForm[];
  height?: number;
}

export default function PlayerFormChart({ form, height = 140 }: PlayerFormChartProps) {
  const width = 100;
  const padX = 6;
  const padY = 12;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const maxRating = 10;
  const maxGoals = Math.max(1, ...form.map((f) => f.goals + f.assists));

  const xStep = form.length > 1 ? chartW / (form.length - 1) : chartW;

  const ratingPoints = form.map((f, i) => {
    const x = padX + i * xStep;
    const y = padY + chartH - (f.rating / maxRating) * chartH;
    return `${x},${y}`;
  });

  const ratingPath =
    form.length > 0
      ? `M ${ratingPoints.join(' L ')}`
      : '';

  const areaPath =
    form.length > 0
      ? `${ratingPath} L ${padX + (form.length - 1) * xStep},${padY + chartH} L ${padX},${padY + chartH} Z`
      : '';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full h-full"
      aria-label="Monthly performance trend"
    >
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={padX}
          y1={padY + chartH * (1 - t)}
          x2={width - padX}
          y2={padY + chartH * (1 - t)}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.3"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {areaPath && (
        <path d={areaPath} fill="rgba(212, 175, 55, 0.12)" stroke="none" />
      )}

      {ratingPath && (
        <path
          d={ratingPath}
          fill="none"
          stroke="#D4AF37"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {form.map((f, i) => {
        const x = padX + i * xStep;
        const yRating = padY + chartH - (f.rating / maxRating) * chartH;
        const barH = ((f.goals + f.assists) / maxGoals) * (chartH * 0.35);
        return (
          <g key={f.month}>
            <rect
              x={x - 1.8}
              y={padY + chartH - barH}
              width={3.6}
              height={barH}
              fill="rgba(45, 106, 79, 0.7)"
              rx={0.5}
            />
            <circle cx={x} cy={yRating} r="2" fill="#D4AF37" />
            <text
              x={x}
              y={height - 2}
              textAnchor="middle"
              fill="rgba(255,255,255,0.45)"
              style={{ fontSize: 5.5 }}
            >
              {f.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
