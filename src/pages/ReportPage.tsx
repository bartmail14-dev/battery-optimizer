import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import type { CalculationResult, BatteryConfig, EnergyProfile, FinancialParams, DashboardState } from '../types';
import { isAIAvailable, sendMessage } from '../services/api';
import { downloadPDF } from '../services/pdf-export';
import { formatEuro, formatYears, formatPercentage, formatEnergy } from '../utils/format';

interface ReportPageProps {
  results: CalculationResult | null;
  batteryConfig: BatteryConfig;
  energyProfile: EnergyProfile;
  financials: FinancialParams;
  dashboardState: DashboardState;
}

export function ReportPage({
  results,
  batteryConfig,
  energyProfile,
  financials,
  dashboardState: _dashboardState,
}: ReportPageProps) {
  const navigate = useNavigate();
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!results) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-lg text-gray-600">Nog geen resultaten. Voer eerst een berekening uit.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Naar invoer
        </button>
      </div>
    );
  }

  async function generateReport() {
    if (!results) return;
    setIsGenerating(true);
    try {
      const prompt = `Schrijf een directierapport (max 600 woorden) voor deze batterijopslag-investering.

GEGEVENS:
- Sector: ${energyProfile.sector}
- Jaarverbruik: ${formatEnergy(energyProfile.annualConsumptionKwh)}
- Batterij: ${batteryConfig.capacityKwh} kWh / ${batteryConfig.powerKw} kW
- Investering: ${formatEuro(results.grossInvestment)}
- Jaarlijkse besparing: ${formatEuro(results.annualSavings)}
- Terugverdientijd: ${formatYears(results.simplePayback)}
- NPV: ${formatEuro(results.npv)}
- IRR: ${isFinite(results.irr) ? formatPercentage(results.irr) : 'n.v.t.'}

SCENARIO'S:
${results.scenarioResults.map((s: { scenario: string; npv: number; simplePayback: number }) => `${s.scenario}: NPV ${formatEuro(s.npv)}, terugverdientijd ${formatYears(s.simplePayback)}`).join('\n')}

Gebruik paragrafen met headers. Wees overtuigend maar eerlijk.`;

      const report = await sendMessage(
        'Je bent een senior energieconsultant. Schrijf in het Nederlands voor directie/CFO.',
        prompt,
        'smart'
      );
      if (report) setAiReport(report);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/results')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug naar resultaten
        </button>
        <button
          onClick={() => downloadPDF({ results, battery: batteryConfig, profile: energyProfile, financials, aiReport: aiReport ?? undefined })}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      <h1 className="text-3xl font-bold text-gray-900">Volledig rapport</h1>

      {/* Financial summary */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Financieel overzicht</h2>
        <table className="w-full text-sm">
          <tbody>
            {[
              ['Totale investering', formatEuro(results.grossInvestment)],
              ['Jaarlijkse besparing (jaar 1)', formatEuro(results.annualSavings)],
              ['Terugverdientijd', formatYears(results.simplePayback)],
              ['Verdisconteerde terugverdientijd', formatYears(results.discountedPayback)],
              ['Netto Contante Waarde (NPV)', formatEuro(results.npv)],
              ['Internal Rate of Return (IRR)', isFinite(results.irr) ? formatPercentage(results.irr) : '—'],
              ['Levelized Cost of Storage (LCOS)', `${formatEuro(results.lcos, 2)}/kWh`],
              [`Totale besparing over ${financials.years} jaar`, formatEuro(results.totalSavings)],
            ].map(([label, value]) => (
              <tr key={label} className="border-b border-gray-100">
                <td className="py-2 text-gray-600">{label}</td>
                <td className="py-2 text-right font-mono font-medium text-gray-900">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* AI Report */}
      {isAIAvailable() && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Analyse & aanbeveling</h2>
          {aiReport ? (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
              {aiReport}
            </div>
          ) : (
            <button
              onClick={generateReport}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Genereren...
                </>
              ) : (
                'Genereer AI-analyse'
              )}
            </button>
          )}
        </section>
      )}

      {/* Disclaimer */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        <strong>Disclaimer:</strong> Deze analyse is indicatief en gebaseerd op de ingevoerde parameters en marktaannames.
        Werkelijke resultaten kunnen afwijken door marktomstandigheden, regelgeving en technische factoren.
        Neem contact op met COMCAM voor een maatwerkadvies.
      </div>
    </div>
  );
}
