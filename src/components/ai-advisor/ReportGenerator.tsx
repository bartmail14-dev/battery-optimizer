import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import type { DashboardState } from '../../types';
import { isAIAvailable, sendMessage } from '../../services/api';
import { formatEuro, formatYears, formatPercentage, formatEnergy } from '../../utils/format';

interface ReportGeneratorProps {
  dashboardState: DashboardState;
  onReportGenerated: (report: string) => void;
}

function buildReportPrompt(state: DashboardState): string {
  const r = state.results;
  if (!r) return '';

  return `Genereer een beknopt directierapport (max 500 woorden) voor een batterijopslag-investering.

RESULTATEN:
- Sector: ${state.energyProfile.sector}
- Jaarverbruik: ${formatEnergy(state.energyProfile.annualConsumptionKwh)}
- Batterijcapaciteit: ${state.batteryConfig.capacityKwh} kWh
- Totale investering: ${formatEuro(r.grossInvestment)}
- Jaarlijkse besparing: ${formatEuro(r.annualSavings)}
- Terugverdientijd: ${formatYears(r.simplePayback)}
- NPV: ${formatEuro(r.npv)}
- IRR: ${isFinite(r.irr) ? formatPercentage(r.irr) : 'n.v.t.'}

SCENARIO'S:
${r.scenarioResults.map(s => `- ${s.scenario}: NPV ${formatEuro(s.npv)}, terugverdientijd ${formatYears(s.simplePayback)}`).join('\n')}

STRUCTUUR:
1. Samenvatting (2 zinnen: advies + kernargument)
2. Financieel overzicht (tabel met kerngetallen)
3. Risico's en kansen (3 bullets elk)
4. Aanbeveling (concreet vervolgstap)
5. Disclaimer

STIJL:
- Professioneel maar toegankelijk voor niet-technische directie
- Nederlands
- Overtuigend maar eerlijk — noem ook risico's
- Eindig met: "Voor een maatwerkadvies kunt u contact opnemen met COMCAM."`;
}

export function ReportGenerator({ dashboardState, onReportGenerated }: ReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const available = isAIAvailable();
  const hasResults = !!dashboardState.results;

  async function handleGenerate() {
    if (!hasResults || isGenerating) return;

    setIsGenerating(true);
    try {
      const report = await sendMessage(
        'Je bent een senior energieconsultant die directierapporten schrijft voor batterijopslag-investeringen in Nederland. Je schrijft overtuigend maar eerlijk, en je doelgroep is directie en CFO.',
        buildReportPrompt(dashboardState),
        'smart'
      );

      if (report) {
        onReportGenerated(report);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  if (!available) return null;

  return (
    <button
      onClick={handleGenerate}
      disabled={!hasResults || isGenerating}
      className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Rapport genereren...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4" />
          Genereer directierapport
        </>
      )}
    </button>
  );
}
