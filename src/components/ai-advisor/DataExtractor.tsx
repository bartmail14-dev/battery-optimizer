import { useState, useRef } from 'react';
import { Upload, FileUp, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { isAIAvailable, sendMessage } from '../../services/api';

interface ExtractedData {
  annualConsumptionKwh?: number;
  peakDemandKw?: number;
  connectionCapacityKw?: number;
  tariffPerKwh?: number;
}

interface DataExtractorProps {
  onDataExtracted: (data: ExtractedData) => void;
}

export function DataExtractor({ onDataExtracted }: DataExtractorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const available = isAIAvailable();

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const text = await file.text();

      const response = await sendMessage(
        `Je bent een data-extractie specialist. Je ontvangt tekst uit een Nederlandse energie-jaarafrekening of CSV-export.
Extraheer de volgende gegevens en retourneer ze als JSON:
{
  "annualConsumptionKwh": <getal in kWh>,
  "peakDemandKw": <getal in kW, null als niet gevonden>,
  "connectionCapacityKw": <getal in kW, null als niet gevonden>,
  "tariffPerKwh": <getal in EUR/kWh, null als niet gevonden>
}
Retourneer ALLEEN de JSON, geen tekst eromheen.
Als je een waarde niet kunt vinden, gebruik null.`,
        `Analyseer deze jaarafrekening en extraheer de energiegegevens:\n\n${text.slice(0, 4000)}`,
        'fast'
      );

      if (response) {
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]) as ExtractedData;
          onDataExtracted(data);
          setStatus('success');
        } else {
          throw new Error('Kon geen gegevens extraheren uit het bestand');
        }
      } else {
        throw new Error('AI-verwerking niet beschikbaar');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Er ging iets mis bij het verwerken'
      );
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  if (!available) return null;

  return (
    <div className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center transition hover:border-blue-400">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv,.txt"
        onChange={handleFileUpload}
        className="hidden"
        id="file-upload"
      />

      <label
        htmlFor="file-upload"
        className="cursor-pointer flex flex-col items-center gap-3"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
            <span className="text-sm text-gray-600">Bestand verwerken...</span>
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle className="h-10 w-10 text-green-500" />
            <span className="text-sm text-green-700">Gegevens succesvol geëxtraheerd!</span>
            <span className="text-xs text-gray-500">Klik om een ander bestand te uploaden</span>
          </>
        ) : status === 'error' ? (
          <>
            <AlertCircle className="h-10 w-10 text-red-500" />
            <span className="text-sm text-red-700">{errorMessage}</span>
            <span className="text-xs text-gray-500">Klik om opnieuw te proberen</span>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-gray-400" />
            <div>
              <span className="text-sm font-medium text-blue-600">Upload jaarafrekening</span>
              <p className="mt-1 text-xs text-gray-500">PDF, CSV of TXT — we vullen de gegevens automatisch in</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <FileUp className="h-3 w-3" />
              Powered by AI
            </div>
          </>
        )}
      </label>
    </div>
  );
}
