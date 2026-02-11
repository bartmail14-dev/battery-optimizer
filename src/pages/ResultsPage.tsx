import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, GitCompareArrows, ChevronDown, ChevronUp } from 'lucide-react';
import type { CalculationResult, BatteryConfig, EnergyProfile, FinancialParams } from '../types';
import type { SensitivityDataPoint } from '../types';
import { GoNoGoVerdict } from '../components/dashboard';
import {
  SavingsChart,
  ScenarioComparison,
  InvestmentWaterfall,
  MonthlyBreakdownChart,
} from '../components/charts';
import { AINarrative } from '../components/ai-narrative/AINarrative';
import { downloadPDF } from '../services/pdf-export';
import { formatEuro, formatNumber, formatPercentage, formatYears } from '../utils/format';

interface ResultsPageProps {
  results: CalculationResult | null;
  sensitivity: SensitivityDataPoint[] | null;
  batteryConfig: BatteryConfig;
  energyProfile: EnergyProfile;
  financials: FinancialParams;
  dashboardState: import('../types').DashboardState;
  isCalculating?: boolean;
  error?: string | null;
  narrative: string;
  isStreaming: boolean;
  narrativeError?: string | null;
}

export function ResultsPage({
  results,
  batteryConfig,
  energyProfile,
  financials,
  isCalculating,
  error,
  narrative,
  isStreaming,
  narrativeError,
}: ResultsPageProps) {
  const navigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (isCalculating) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="mt-4 text-lg text-gray-600">Berekening wordt uitgevoerd...</p>
        <p className="mt-1 text-sm text-gray-400">Dit kan enkele seconden duren</p>
      </div>
    );
  }

  if (error && !results) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-lg text-red-600">Er is een fout opgetreden: {error}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug naar invoer
        </button>
      </div>
    );
  }

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

  const cashflows = results.cashflows;

  async function handleDownloadPDF() {
    await downloadPDF({
      results: results!,
      battery: batteryConfig,
      profile: energyProfile,
      financials,
      aiReport: narrative || undefined,
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug naar invoer
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vergelijking')}
            className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            <GitCompareArrows className="h-4 w-4" />
            Vergelijken
          </button>
          <button
            onClick={() => handleDownloadPDF()}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* 1. Go/No-Go Verdict (compact) */}
      <GoNoGoVerdict results={results} financials={financials} />

      {/* 2. AI Narratief (hoofdcontent) */}
      <AINarrative
        narrative={narrative}
        isStreaming={isStreaming}
        error={narrativeError}
      />

      {/* 3. KPI Kaarten */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">NPV</p>
          <p className={`mt-1 text-2xl font-bold ${results.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatEuro(results.npv)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Terugverdientijd</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatYears(results.simplePayback)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">IRR</p>
          <p className={`mt-1 text-2xl font-bold ${results.irr > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercentage(results.irr)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Jaarlijkse besparing</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">
            {formatEuro(results.arbitrageSavings + results.peakShavingSavings + results.annualSubsidy)}
          </p>
        </div>
      </div>

      {/* 4. Grafieken ter onderbouwing */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ScenarioComparison scenarios={results.scenarioResults} />
        <SavingsChart
          cashflows={cashflows}
          years={financials.years}
          paybackYear={results.simplePayback}
        />
      </div>

      <InvestmentWaterfall
        grossInvestment={results.grossInvestment}
        netInvestment={results.netInvestment}
        yearlyBreakdown={results.yearlyBreakdown}
        peakShavingSavings={results.peakShavingSavings}
        annualSubsidy={results.annualSubsidy}
        maintenanceCost={batteryConfig.annualMaintenanceCost}
        years={financials.years}
      />

      <MonthlyBreakdownChart data={results.monthlyBreakdown} />

      {/* 5. Meer details (uitklapbaar) */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="flex w-full items-center justify-between p-5 text-left"
        >
          <span className="text-sm font-semibold text-gray-700">Meer details</span>
          {detailsOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
        {detailsOpen && (
          <div className="border-t border-gray-100 p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500">Bruto investering</p>
                <p className="text-sm font-semibold text-gray-900">{formatEuro(results.grossInvestment)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Netto investering</p>
                <p className="text-sm font-semibold text-gray-900">{formatEuro(results.netInvestment)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Arbitrage besparing</p>
                <p className="text-sm font-semibold text-blue-600">{formatEuro(results.arbitrageSavings)}/jr</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Piekbesparing</p>
                <p className="text-sm font-semibold text-blue-600">{formatEuro(results.peakShavingSavings)}/jr</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Piekreductie</p>
                <p className="text-sm font-semibold text-blue-600">{formatNumber(results.peakReductionKw, 1)} kW</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">SDE++ subsidie</p>
                <p className="text-sm font-semibold text-green-600">{formatEuro(results.annualSubsidy)}/jr</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">LCOS</p>
                <p className="text-sm font-semibold text-gray-900">{formatEuro(results.lcos, 4)}/kWh</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">CO2 reductie</p>
                <p className="text-sm font-semibold text-green-600">{formatNumber(results.co2ReductionKg, 0)} kg/jr</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Jaarlijkse cycli</p>
                <p className="text-sm font-semibold text-gray-900">{formatNumber(results.simulation.totalCycles, 0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Blended grid price</p>
                <p className="text-sm font-semibold text-gray-900">{formatEuro(results.blendedGridPrice, 4)}/kWh</p>
              </div>
              {results.noSubsidyNpv !== undefined && (
                <div>
                  <p className="text-xs text-gray-500">NPV zonder subsidie</p>
                  <p className={`text-sm font-semibold ${results.noSubsidyNpv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatEuro(results.noSubsidyNpv)}
                  </p>
                </div>
              )}
              {results.noSubsidyPayback !== undefined && (
                <div>
                  <p className="text-xs text-gray-500">Payback zonder subsidie</p>
                  <p className="text-sm font-semibold text-gray-900">{formatYears(results.noSubsidyPayback)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-center text-white">
        <h3 className="text-2xl font-bold">Klaar voor de volgende stap?</h3>
        <p className="mt-2 text-blue-100">
          Onze experts helpen u graag met een maatwerkadvies op basis van uw werkelijke verbruiksdata.
        </p>
        <a
          href="mailto:info@comcam.nl"
          className="mt-4 inline-block rounded-xl bg-white px-8 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
        >
          Neem contact op met COMCAM
        </a>
      </div>
    </div>
  );
}
