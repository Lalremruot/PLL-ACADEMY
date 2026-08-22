'use client';

import React from 'react';
import type { PlayerAttributeRatings } from '../../types';

interface PlayerRadarChartProps {
  attributes: PlayerAttributeRatings;
  size?: number;
}

const LABELS: (keyof PlayerAttributeRatings)[] = [
  'pace',
  'shooting',
  'passing',
  'dribbling',
  'defending',
  'physical',
];

const LABEL_DISPLAY: Record<keyof PlayerAttributeRatings, string> = {
  pace: 'PAC',
  shooting: 'SHO',
  passing: 'PAS',
  dribbling: 'DRI',
  defending: 'DEF',
  physical: 'PHY',
};

export default function PlayerRadarChart({ attributes, size = 220 }: PlayerRadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.34;
  const levels = [25, 50, 75, 99];

  const angleStep = (2 * Math.PI) / LABELS.length;
  const startAngle = -Math.PI / 2;

  const pointAt = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const r = (value / 99) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const dataPoints = LABELS.map((key, i) => pointAt(i, attributes[key]));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[240px] mx-auto" aria-label="Player attribute radar">
      {levels.map((level) => {
        const ring = LABELS.map((_, i) => {
          const p = pointAt(i, level);
          return `${p.x},${p.y}`;
        }).join(' ');
        return (
          <polygon
            key={level}
            points={ring}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        );
      })}

      {LABELS.map((_, i) => {
        const outer = pointAt(i, 99);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={outer.x}
            y2={outer.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        );
      })}

      <path
        d={dataPath}
        fill="rgba(212, 175, 55, 0.25)"
        stroke="#D4AF37"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#D4AF37" />
      ))}

      {LABELS.map((key, i) => {
        const labelPt = pointAt(i, 118);
        return (
          <g key={key}>
            <text
              x={labelPt.x}
              y={labelPt.y - 4}
              textAnchor="middle"
              className="fill-gray-500 text-[8px] font-mono uppercase"
              style={{ fontSize: 9 }}
            >
              {LABEL_DISPLAY[key]}
            </text>
            <text
              x={labelPt.x}
              y={labelPt.y + 8}
              textAnchor="middle"
              className="fill-white font-bold"
              style={{ fontSize: 11 }}
            >
              {attributes[key]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
