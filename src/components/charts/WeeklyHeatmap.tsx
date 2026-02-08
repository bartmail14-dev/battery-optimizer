import { useMemo } from 'react';
import type { HourlySimulationResult } from '../../types';
import { InfoTooltip } from '../shared';
import { formatNumber } from '../../utils/format';

interface WeeklyHeatmapProps {
  hourlyResults: HourlySimulationResult[];
}

const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const CELL_SIZE = 28;
const LABEL_WIDTH = 32;
const HEADER_HEIGHT = 24;

function getColor(value: number, maxAbs: number): string {
  if (maxAbs === 0) return '#e5e7eb'; // gray
  const ratio = value / maxAbs;
  if (ratio > 0.1) {
    // Discharge = green
    const intensity = Math.min(Math.abs(ratio), 1);
    const g = Math.round(200 + intensity * 55);
    const r = Math.round(220 - intensity * 180);
    const b = Math.round(220 - intensity * 180);
    return `rgb(${r},${g},${b})`;
  }
  if (ratio < -0.1) {
    // Charge = blue
    const intensity = Math.min(Math.abs(ratio), 1);
    const b = Math.round(200 + intensity * 55);
    const r = Math.round(220 - intensity * 180);
    const g = Math.round(220 - intensity * 140);
    return `rgb(${r},${g},${b})`;
  }
  return '#e5e7eb'; // idle
}

function getDayOfWeek(hourIndex: number): number {
  // hour 0 = Jan 1. In 2024 (representative year), Jan 1 is Monday = 0
  const dayIndex = Math.floor(hourIndex / 24);
  return dayIndex % 7;
}

export function WeeklyHeatmap({ hourlyResults }: WeeklyHeatmapProps) {
  const { grid, maxAbs } = useMemo(() => {
    // 7 days x 24 hours: sum and count
    const sums: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    const counts: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const h of hourlyResults) {
      const dow = getDayOfWeek(h.hour);
      const hod = h.hour % 24;
      const netAction = h.batteryDischarge - h.batteryCharge;
      sums[dow][hod] += netAction;
      counts[dow][hod] += 1;
    }

    const averages: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let maxAbsVal = 0;

    for (let d = 0; d < 7; d++) {
      for (let hr = 0; hr < 24; hr++) {
        averages[d][hr] = counts[d][hr] > 0 ? sums[d][hr] / counts[d][hr] : 0;
        maxAbsVal = Math.max(maxAbsVal, Math.abs(averages[d][hr]));
      }
    }

    return { grid: averages, maxAbs: maxAbsVal };
  }, [hourlyResults]);

  if (!hourlyResults || hourlyResults.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">Wekelijks batterijpatroon</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen simulatiedata beschikbaar</p>
      </div>
    );
  }

  const svgWidth = LABEL_WIDTH + 24 * CELL_SIZE + 4;
  const svgHeight = HEADER_HEIGHT + 7 * CELL_SIZE + 4;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">Wekelijks batterijpatroon</h3>
        <InfoTooltip text="Heatmap van gemiddeld batterijgedrag per dag en uur. Groen = ontladen (levering), blauw = laden, grijs = inactief." />
      </div>

      <div className="overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} className="block">
          {/* Hour labels */}
          {Array.from({ length: 24 }, (_, hr) => (
            <text
              key={`h-${hr}`}
              x={LABEL_WIDTH + hr * CELL_SIZE + CELL_SIZE / 2}
              y={HEADER_HEIGHT - 6}
              textAnchor="middle"
              fontSize={9}
              fill="#6b7280"
            >
              {hr}
            </text>
          ))}

          {/* Grid */}
          {grid.map((row, d) =>
            row.map((val, hr) => (
              <g key={`${d}-${hr}`}>
                <rect
                  x={LABEL_WIDTH + hr * CELL_SIZE}
                  y={HEADER_HEIGHT + d * CELL_SIZE}
                  width={CELL_SIZE - 2}
                  height={CELL_SIZE - 2}
                  rx={3}
                  fill={getColor(val, maxAbs)}
                >
                  <title>
                    {DAY_LABELS[d]} {hr}:00 — {formatNumber(val, 2)} kW netto
                  </title>
                </rect>
              </g>
            ))
          )}

          {/* Day labels */}
          {DAY_LABELS.map((label, d) => (
            <text
              key={`d-${d}`}
              x={LABEL_WIDTH - 6}
              y={HEADER_HEIGHT + d * CELL_SIZE + CELL_SIZE / 2 + 3}
              textAnchor="end"
              fontSize={10}
              fill="#6b7280"
            >
              {label}
            </text>
          ))}
        </svg>
      </div>

      {/* Caveat + Legend */}
      <p className="mt-3 text-xs text-gray-400">
        Gemiddeld weekpatroon over het hele jaar. Werkelijke dag-van-de-week toewijzing kan afwijken afhankelijk van het startjaar.
      </p>
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-blue-400" />
          <span>Laden</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-gray-200" />
          <span>Inactief</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-green-400" />
          <span>Ontladen</span>
        </div>
      </div>
    </div>
  );
}
