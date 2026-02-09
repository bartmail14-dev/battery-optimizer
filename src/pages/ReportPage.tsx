import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import type {
  CalculationResult, BatteryConfig, EnergyProfile, FinancialParams,
  DashboardState, SensitivityDataPoint, PdfReportConfig,
} from '../types';
import { isAIAvailable, sendMessage } from '../services/api';
import { downloadPDF } from '../services/pdf-export';
import { downloadFullReport } from '../services/pdf-report';
import { downloadExcel } from '../services/excel-export';
import { formatEuro, formatYears, formatPercentage, formatEnergy } from '../utils/format';

interface ReportPageProps {
  results: CalculationResult | null;
  batteryConfig: BatteryConfig;
  energyProfile: EnergyProfile;
  financials: FinancialParams;
  dashboardState: DashboardState;
  sensitivity: SensitivityDataPoint[] | null;
}

export function ReportPage({
  results,
  batteryConfig,
  energyProfile,
  financials,
  dashboardState,
  sensitivity,
}: ReportPageProps) {
  const navigate = useNavigate();
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  // Report config form state
  const [clientName, setClientName] = useState('');
  const [projectRef, setProjectRef] = useState('');
  const [consultantName, setConsultantName] = useState('');

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

  async function handleDownloadQuickPdf() {
    if (!results) return;
    await downloadPDF({
      results,
      battery: batteryConfig,
      profile: energyProfile,
      financials,
      aiReport: aiReport ?? undefined,
    });
  }

  async function handleDownloadFullPdf() {
    if (!results || !sensitivity) return;
    setIsDownloadingPdf(true);
    try {
      const config: PdfReportConfig = {
        clientName: clientName || 'Klant',
        projectRef: projectRef || undefined,
        consultantName: consultantName || undefined,
        includeAiAnalysis: !!aiReport,
        aiReportText: aiReport ?? undefined,
      };
      await downloadFullReport({
        config,
        results,
        battery: batteryConfig,
        profile: energyProfile,
        tariffs: dashboardState.tariffs,
        subsidies: dashboardState.subsidies,
        financials,
        sensitivity,
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  async function handleDownloadExcel() {
    if (!results || !sensitivity) return;
    setIsDownloadingExcel(true);
    try {
      await downloadExcel({
        config: {
          clientName: clientName || 'Klant',
          projectRef: projectRef || undefined,
        },
        results,
        battery: batteryConfig,
        profile: energyProfile,
        tariffs: dashboardState.tariffs,
        subsidies: dashboardState.subsidies,
        financials,
        sensitivity,
      });
    } finally {
      setIsDownloadingExcel(false);
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
          onClick={handleDownloadQuickPdf}
          className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          Snelle PDF (3 pag.)
        </button>
      </div>

      <h1 className="text-3xl font-bold text-gray-900">Rapport & Export</h1>

      {/* Report config form */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Rapportinstellingen</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Klantnaam</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="bijv. Hotel Zeezicht"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Projectreferentie</label>
            <input
              type="text"
              value={projectRef}
              onChange={(e) => setProjectRef(e.target.value)}
              placeholder="bijv. PRJ-2025-001"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Consultant</label>
            <input
              type="text"
              value={consultantName}
              onChange={(e) => setConsultantName(e.target.value)}
              placeholder="bijv. Jan de Vries"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Download buttons */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Downloads</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={handleDownloadFullPdf}
            disabled={isDownloadingPdf || !sensitivity}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isDownloadingPdf ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            <div className="text-left">
              <div>Volledig PDF Rapport</div>
              <div className="text-xs font-normal text-blue-200">~15 pagina&apos;s, directie-kwaliteit</div>
            </div>
          </button>

          <button
            onClick={handleDownloadExcel}
            disabled={isDownloadingExcel || !sensitivity}
            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {isDownloadingExcel ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-5 w-5" />
            )}
            <div className="text-left">
              <div>Excel Export</div>
              <div className="text-xs font-normal text-green-200">5 bladen, DCF met formules</div>
            </div>
          </button>
        </div>
      </section>

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
              ['Internal Rate of Return (IRR)', isFinite(results.irr) ? formatPercentage(results.irr) : '\u2014'],
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
