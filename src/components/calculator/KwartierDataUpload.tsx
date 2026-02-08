import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { parseKwartierData } from '../../utils/csv-parser';
import { formatNumber, formatEnergy } from '../../utils/format';
import type { KwartierDataParseResult } from '../../types';

interface KwartierDataUploadProps {
  onDataAccepted: (data: {
    hourlyConsumptionKwh: number[];
    annualConsumptionKwh: number;
    peakDemandKw: number;
  }) => void;
  onClear: () => void;
  hasCustomProfile: boolean;
}

export function KwartierDataUpload({ onDataAccepted, onClear, hasCustomProfile }: KwartierDataUploadProps) {
  const [parseResult, setParseResult] = useState<KwartierDataParseResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseKwartierData(text);
      setParseResult(result);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleAccept() {
    if (parseResult?.success) {
      onDataAccepted({
        hourlyConsumptionKwh: parseResult.hourlyConsumptionKwh,
        annualConsumptionKwh: parseResult.annualConsumptionKwh,
        peakDemandKw: parseResult.peakDemandKw,
      });
    }
  }

  function handleClear() {
    setParseResult(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClear();
  }

  // Already accepted state
  if (hasCustomProfile && !parseResult) {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Kwartierdata geladen</p>
              <p className="text-sm text-green-600">Eigen verbruiksdata wordt gebruikt voor de berekening</p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="rounded-lg border border-green-300 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100"
          >
            Verwijder data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Verbruiksdata uploaden</h3>
        <p className="text-sm text-gray-500">
          Upload uw kwartierdata (CSV) van uw energieleverancier of netbeheerder voor een nauwkeurige analyse.
        </p>
      </div>

      {/* Drop zone */}
      {!parseResult && (
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mb-3 h-8 w-8 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">
            Sleep uw CSV-bestand hierheen of klik om te uploaden
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Kwartierdata (35.040 rijen) of uurdata (8.760 rijen) &mdash; CSV met ; of , scheidingsteken
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      )}

      {/* Parse result */}
      {parseResult && !parseResult.success && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Bestand kon niet worden verwerkt</p>
              <p className="mt-1 text-sm text-red-600">{parseResult.error}</p>
              <button
                onClick={handleClear}
                className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
              >
                Opnieuw proberen
              </button>
            </div>
          </div>
        </div>
      )}

      {parseResult?.success && (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div className="flex-1">
              <p className="font-medium text-blue-800">{fileName}</p>
              <p className="text-sm text-blue-600">{formatNumber(parseResult.rowsParsed)} rijen verwerkt</p>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{formatEnergy(parseResult.annualConsumptionKwh)}</p>
              <p className="text-xs text-gray-500">Jaarverbruik</p>
            </div>
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{formatNumber(parseResult.peakDemandKw, 0)} kW</p>
              <p className="text-xs text-gray-500">Piekvraag</p>
            </div>
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{parseResult.gaps}</p>
              <p className="text-xs text-gray-500">Gaten</p>
            </div>
          </div>

          {/* Warnings */}
          {parseResult.warnings.length > 0 && (
            <div className="space-y-1">
              {parseResult.warnings.map((w, i) => (
                <p key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                  {w}
                </p>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Gebruik deze data
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
