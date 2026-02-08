import { clsx } from 'clsx';

export type MetricStatus = 'positive' | 'neutral' | 'negative';

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  explanation?: string;
  status?: MetricStatus;
  onClick?: () => void;
}

const statusColors: Record<MetricStatus, string> = {
  positive: 'text-green-600 bg-green-50 border-green-200',
  neutral: 'text-gray-700 bg-gray-50 border-gray-200',
  negative: 'text-red-600 bg-red-50 border-red-200',
};

export function MetricCard({
  label,
  value,
  unit,
  trend,
  explanation,
  status = 'neutral',
  onClick,
}: MetricCardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border-2 p-6 transition-shadow hover:shadow-md',
        statusColors[status],
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
    >
      <p className="text-sm font-medium uppercase tracking-wide opacity-70">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        {unit && <span className="text-lg opacity-60">{unit}</span>}
      </div>
      {trend && (
        <p className="mt-1 text-sm font-medium opacity-80">{trend}</p>
      )}
      {explanation && (
        <p className="mt-2 text-xs opacity-60 leading-relaxed">{explanation}</p>
      )}
    </div>
  );
}
