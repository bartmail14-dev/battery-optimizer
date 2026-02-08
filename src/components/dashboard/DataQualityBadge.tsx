interface DataQualityBadgeProps {
  dataSource: 'csv' | 'synthetic';
}

export function DataQualityBadge({ dataSource }: DataQualityBadgeProps) {
  if (dataSource === 'csv') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-200">
          <svg className="h-4 w-4 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span>Analyse op basis van <strong>werkelijk verbruiksprofiel</strong> (CSV-upload)</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200">
        <svg className="h-4 w-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 110 18 9 9 0 010-18z" />
        </svg>
      </div>
      <span>
        Analyse op basis van <strong>synthetisch profiel</strong> — upload uw kwartierdata voor een nauwkeuriger resultaat
      </span>
    </div>
  );
}
