import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import type { CalculationResult, BatteryConfig, EnergyProfile, FinancialParams } from '../types';
import type { SensitivityDataPoint } from '../types';
import {
  ExecutiveSummary,
  GoNoGoVerdict,
  WorstCaseCard,
  BatteryUtilizationKPIs,
  CycleLifeIndicator,
  GridIndependenceMetrics,
  CO2ReductionCard,
  DataQualityBadge,
  SectorBenchmark,
  BatteryCostBenchmark,
  PaybackConfidenceRange,
} from '../components/dashboard';
import {
  SavingsChart,
  ScenarioComparison,
  EnergyProfileChart,
  SensitivityTornado,
  MonthlyBreakdownChart,
  StateOfChargeChart,
  PeakDemandChart,
  RevenueBreakdownChart,
  DegradationChart,
  InvestmentWaterfall,
  LcosComparison,
  CapitalCostComparison,
  CashflowWaterfall,
  WeeklyHeatmap,
  GridImportProfile,
  MonthlyPeakComparison,
  AllInCostComparison,
  EpexPriceOverlay,
  SubsidyImpactComparison,
  SubsidyScheduleChart,
  OperatingRegimePie,
  RevenueBySourceTimeline,
  CO2CumulativeTimeline,
} from '../components/charts';
import { DcfTable, PeakEventTable, MonthlySavingsTable, AssumptionsSummary } from '../components/tables';
import { ReportGenerator } from '../components/ai-advisor';
import { downloadPDF } from '../services/pdf-export';
import { formatEuro, formatNumber } from '../utils/format';

type TabId = 'samenvatting' | 'financieel' | 'technisch' | 'operationeel' | 'risico';

const TABS: { id: TabId; label: string }[] = [
  { id: 'samenvatting', label: 'Samenvatting' },
  { id: 'financieel', label: 'Financieel' },
  { id: 'technisch', label: 'Technisch' },
  { id: 'operationeel', label: 'Operationeel' },
  { id: 'risico', label: 'Risico & Markt' },
];

interface ResultsPageProps {
  results: CalculationResult | null;
  sensitivity: SensitivityDataPoint[] | null;
  batteryConfig: BatteryConfig;
  energyProfile: EnergyProfile;
  financials: FinancialParams;
  dashboardState: import('../types').DashboardState;
  isCalculating?: boolean;
  error?: string | null;
}

export function ResultsPage({
  results,
  sensitivity,
  batteryConfig,
  energyProfile,
  financials,
  dashboardState,
  isCalculating,
  error,
}: ResultsPageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('samenvatting');

  if (isCalculating) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="mt-4 text-lg text-gray-600">Berekening wordt uitgevoerd...</p>
        <p className="mt-1 text-sm text-gray-400">Dit kan enkele seconden duren</p>
      </div>
    );
  }

  if (error) {
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

  const tariffs = dashboardState.tariffs;
  const cashflows = results.cashflows;
  const hourlyConsumption = results.simulation.hourlyResults.map((h) => h.consumption);
  const batteryCharge = results.simulation.hourlyResults.map((h) => h.batteryCharge);
  const batteryDischarge = results.simulation.hourlyResults.map((h) => h.batteryDischarge);

  const pessimisticScenario = results.scenarioResults.find(
    (s) => s.scenario === 'pessimistic'
  );

  async function handleDownloadPDF(aiReport?: string) {
    await downloadPDF({
      results: results!,
      battery: batteryConfig,
      profile: energyProfile,
      financials,
      aiReport,
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
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
          <ReportGenerator
            dashboardState={dashboardState}
            onReportGenerated={(report) => handleDownloadPDF(report)}
          />
          <button
            onClick={() => handleDownloadPDF()}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="overflow-x-auto border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'samenvatting' && (
        <div className="space-y-6">
          {/* Go/No-Go Verdict */}
          <GoNoGoVerdict results={results} financials={financials} />

          {/* Executive Summary (5 metric cards) */}
          <ExecutiveSummary results={results} />

          {/* Payback Confidence Range */}
          {results.paybackConfidence && (
            <PaybackConfidenceRange paybackConfidence={results.paybackConfidence} />
          )}

          {/* Investment Waterfall */}
          <InvestmentWaterfall
            grossInvestment={results.grossInvestment}
            netInvestment={results.netInvestment}
            yearlyBreakdown={results.yearlyBreakdown}
            peakShavingSavings={results.peakShavingSavings}
            annualSubsidy={results.annualSubsidy}
            maintenanceCost={batteryConfig.annualMaintenanceCost}
            years={financials.years}
          />

          {/* LCOS Comparison */}
          <LcosComparison
            lcos={results.lcos}
            blendedGridPrice={results.blendedGridPrice}
            peakRate={tariffs.peakRate}
            offPeakRate={tariffs.offPeakRate}
          />

          {/* Worst Case Card */}
          {pessimisticScenario && (
            <WorstCaseCard pessimisticScenario={pessimisticScenario} />
          )}

          {/* Capital Cost Comparison */}
          <CapitalCostComparison irr={results.irr} />

          {/* Investment Breakdown (existing) */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Investeringsoverzicht</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <div>
                <p className="text-xs text-gray-500">Bruto investering</p>
                <p className="text-lg font-semibold text-gray-900">{formatEuro(results.grossInvestment)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">EIA voordeel</p>
                <p className="text-lg font-semibold text-green-600">
                  -{formatEuro(results.grossInvestment - results.netInvestment)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Netto investering</p>
                <p className="text-lg font-semibold text-gray-900">{formatEuro(results.netInvestment)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Piekbesparing</p>
                <p className="text-lg font-semibold text-blue-600">
                  {formatEuro(results.peakShavingSavings)}/jr
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Piekreductie</p>
                <p className="text-lg font-semibold text-blue-600">
                  {formatNumber(results.peakReductionKw, 1)} kW
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">SDE++ subsidie</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatEuro(results.annualSubsidy)}/jr
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'financieel' && (
        <div className="space-y-6">
          {/* Existing: SavingsChart + ScenarioComparison */}
          <div className="grid gap-6 lg:grid-cols-2">
            <SavingsChart
              cashflows={cashflows}
              years={financials.years}
              paybackYear={results.simplePayback}
            />
            <ScenarioComparison scenarios={results.scenarioResults} />
          </div>

          {/* Existing: RevenueBreakdownChart */}
          <RevenueBreakdownChart
            arbitrageSavings={results.arbitrageSavings}
            peakShavingSavings={results.peakShavingSavings}
            annualSubsidy={results.annualSubsidy}
            maintenanceCost={batteryConfig.annualMaintenanceCost}
          />

          {/* New: CashflowWaterfall */}
          <CashflowWaterfall yearlyBreakdown={results.yearlyBreakdown} />

          {/* New: DcfTable */}
          <DcfTable yearlyBreakdown={results.yearlyBreakdown} />

          {/* Existing: DegradationChart */}
          <DegradationChart yearlyBreakdown={results.yearlyBreakdown} />

          {/* New: SubsidyImpactComparison */}
          <SubsidyImpactComparison
            npv={results.npv}
            noSubsidyNpv={results.noSubsidyNpv}
            simplePayback={results.simplePayback}
            noSubsidyPayback={results.noSubsidyPayback}
            irr={results.irr}
            noSubsidyIrr={results.noSubsidyIrr}
            subsidyImpactEur={results.subsidyImpactEur}
          />

          {/* New: SubsidyScheduleChart */}
          {results.subsidySchedule && (
            <SubsidyScheduleChart subsidySchedule={results.subsidySchedule} />
          )}

          {/* New: RevenueBySourceTimeline */}
          {results.yearlyRevenueBreakdown && (
            <RevenueBySourceTimeline yearlyRevenueBreakdown={results.yearlyRevenueBreakdown} />
          )}
        </div>
      )}

      {activeTab === 'technisch' && (
        <div className="space-y-6">
          <BatteryUtilizationKPIs
            simulation={results.simulation}
            battery={batteryConfig}
          />

          {/* New: OperatingRegimePie */}
          {results.operatingRegime && (
            <OperatingRegimePie operatingRegime={results.operatingRegime} />
          )}

          <CycleLifeIndicator
            totalCycles={results.simulation.totalCycles}
            cycleLife={batteryConfig.cycleLife}
            lifespanYears={batteryConfig.lifespanYears}
          />
          <StateOfChargeChart hourlyResults={results.simulation.hourlyResults} />
          <PeakDemandChart
            hourlyResults={results.simulation.hourlyResults}
            peakReductionKw={results.peakReductionKw}
          />
        </div>
      )}

      {activeTab === 'operationeel' && (
        <div className="space-y-6">
          <GridIndependenceMetrics
            hourlyResults={results.simulation.hourlyResults}
            annualConsumptionKwh={energyProfile.annualConsumptionKwh}
          />
          <EnergyProfileChart
            hourlyConsumption={hourlyConsumption}
            batteryCharge={batteryCharge}
            batteryDischarge={batteryDischarge}
          />
          <GridImportProfile hourlyResults={results.simulation.hourlyResults} />
          <WeeklyHeatmap hourlyResults={results.simulation.hourlyResults} />
          <MonthlyPeakComparison hourlyResults={results.simulation.hourlyResults} />
          <PeakEventTable hourlyResults={results.simulation.hourlyResults} />
          <MonthlyBreakdownChart data={results.monthlyBreakdown} />
          <MonthlySavingsTable monthlyBreakdown={results.monthlyBreakdown} />
        </div>
      )}

      {activeTab === 'risico' && (
        <div className="space-y-6">
          <DataQualityBadge dataSource={energyProfile.dataSource ?? 'synthetic'} />

          <SectorBenchmark
            simplePayback={results.simplePayback}
            sector={energyProfile.sector}
            subsidyEnabled={dashboardState.subsidies.sdeEligible}
          />

          <BatteryCostBenchmark costPerKwh={batteryConfig.costPerKwh} />

          <CO2ReductionCard co2ReductionKg={results.co2ReductionKg} />

          {/* New: CO2CumulativeTimeline */}
          {results.co2Timeline && (
            <CO2CumulativeTimeline co2Timeline={results.co2Timeline} />
          )}

          <AllInCostComparison
            blendedGridPrice={results.blendedGridPrice}
            totalCostWithBattery={results.simulation.totalCostWithBattery}
            annualConsumptionKwh={energyProfile.annualConsumptionKwh}
            lcos={results.lcos}
          />

          {sensitivity && sensitivity.length > 0 && (
            <SensitivityTornado data={sensitivity} />
          )}

          {tariffs.pricingMode === 'dynamic' && tariffs.hourlyPrices && (
            <EpexPriceOverlay
              hourlyPrices={tariffs.hourlyPrices}
              hourlyResults={results.simulation.hourlyResults}
            />
          )}

          <AssumptionsSummary
            battery={batteryConfig}
            profile={energyProfile}
            tariffs={tariffs}
            subsidies={dashboardState.subsidies}
            financials={financials}
          />
        </div>
      )}

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
