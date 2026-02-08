import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useMemo } from 'react';
import type { HourlySimulationResult } from '../../types';
import { formatNumber } from '../../utils/format';
import { InfoTooltip } from '../shared';

interface EpexPriceOverlayProps {
  hourlyPrices: number[];
  hourlyResults: HourlySimulationResult[];
}

interface HourlyOverlayData {
  uur: string;
  prijsCt: number;
  laden: number;
  ontladen: number;
}

export function EpexPriceOverlay({ hourlyPrices, hourlyResults }: EpexPriceOverlayProps) {
  const data = useMemo<HourlyOverlayData[]>(() => {
    const chargeSums = Array(24).fill(0);
    const dischargeSums = Array(24).fill(0);
    const counts = Array(24).fill(0);

    for (const h of hourlyResults) {
      const hod = h.hour % 24;
      chargeSums[hod] += h.batteryCharge;
      dischargeSums[hod] += h.batteryDischarge;
      counts[hod] += 1;
    }

    return Array.from({ length: 24 }, (_, hr) => ({
      uur: `${hr}:00`,
      prijsCt: Math.round((hourlyPrices[hr] ?? 0) * 10000) / 100,
      laden: counts[hr] > 0 ? -Math.round((chargeSums[hr] / counts[hr]) * 100) / 100 : 0,
      ontladen: counts[hr] > 0 ? Math.round((dischargeSums[hr] / counts[hr]) * 100) / 100 : 0,
    }));
  }, [hourlyPrices, hourlyResults]);

  if (!hourlyResults || hourlyResults.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-800">EPEX prijsprofiel met batterijgedrag</h3>
        <p className="mt-4 text-center text-sm text-gray-400">Geen simulatiedata beschikbaar</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">EPEX prijsprofiel met batterijgedrag</h3>
        <InfoTooltip text="Toont hoe de batterij reageert op het day-ahead prijsprofiel: laden bij lage prijzen (blauw, negatief) en ontladen bij hoge prijzen (groen, positief)." />
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="uur" tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="price"
            orientation="left"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${formatNumber(v, 1)} ct`}
            label={{ value: 'ct/kWh', angle: -90, position: 'insideLeft', offset: 0, fontSize: 12 }}
          />
          <YAxis
            yAxisId="power"
            orientation="right"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${formatNumber(v, 1)}`}
            label={{ value: 'kW', angle: 90, position: 'insideRight', offset: 0, fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => {
              const v = Number(value ?? 0);
              const n = String(name);
              if (n === 'prijsCt') return [`${formatNumber(v, 2)} ct/kWh`, 'EPEX prijs'];
              if (n === 'laden') return [`${formatNumber(Math.abs(v), 2)} kW`, 'Laden (gem.)'];
              return [`${formatNumber(v, 2)} kW`, 'Ontladen (gem.)'];
            }}
          />
          <Legend
            formatter={(value: string) => {
              if (value === 'prijsCt') return 'EPEX prijs';
              if (value === 'laden') return 'Laden';
              return 'Ontladen';
            }}
          />
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="prijsCt"
            stroke="#f59e0b"
            fill="#fef3c7"
            fillOpacity={0.6}
            strokeWidth={2}
            name="prijsCt"
          />
          <Bar yAxisId="power" dataKey="laden" fill="#3b82f6" name="laden" />
          <Bar yAxisId="power" dataKey="ontladen" fill="#22c55e" name="ontladen" />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-gray-400">
        Gemiddeld dagpatroon op basis van 8.760 uur simulatie. Werkelijke EPEX-prijzen variëren dagelijks.
      </p>
    </div>
  );
}
