import { useNavigate } from 'react-router-dom';
import { BatteryConfigurator } from '../components/calculator';
import { KwartierDataUpload } from '../components/calculator/KwartierDataUpload';
import type { BatteryConfig, EnergyProfile, Sector, TariffStructure, SubsidyConfig, FinancialParams } from '../types';
import { generateHourlyProfile } from '../services/calculations/profile-generator';
import { recommendViaAPI } from '../services/api/api-client';
import type { SizingRecommendation } from '../services/calculations/battery-sizing';

interface CalculateOverrides {
  batteryConfig?: BatteryConfig;
  energyProfile?: EnergyProfile;
}

interface InputPageProps {
  batteryConfig: BatteryConfig;
  sector: Sector;
  annualConsumption: number;
  peakDemand: number;
  connectionCapacity: number;
  tariffs: TariffStructure;
  subsidies: SubsidyConfig;
  financials: FinancialParams;
  isCalculating: boolean;
  hasCustomProfile: boolean;
  customHourlyProfile: number[] | null;
  setBatteryConfig: (config: BatteryConfig) => void;
  setSector: (sector: Sector) => void;
  setAnnualConsumption: (v: number) => void;
  setPeakDemand: (v: number) => void;
  setConnectionCapacity: (v: number) => void;
  setCustomHourlyProfile: (profile: number[] | null) => void;
  calculate: (overrides?: CalculateOverrides) => void;
}

export function InputPage({
  batteryConfig,
  sector,
  annualConsumption,
  peakDemand,
  connectionCapacity,
  tariffs,
  subsidies,
  financials,
  isCalculating,
  hasCustomProfile,
  customHourlyProfile,
  setBatteryConfig,
  setSector,
  setAnnualConsumption,
  setPeakDemand,
  setConnectionCapacity,
  setCustomHourlyProfile,
  calculate,
}: InputPageProps) {
  const navigate = useNavigate();

  async function handleSubmit(data: Record<string, unknown>) {
    const d = data as {
      sector: Sector;
      annualConsumptionKwh: number;
      peakDemandKw: number;
      connectionCapacityKw: number;
      capacityKwh: number;
      powerKw: number;
      roundTripEfficiency: number;
      annualDegradation: number;
      cycleLife: number;
      depthOfDischarge: number;
      costPerKwh: number;
      installationCost: number;
      annualMaintenanceCost: number;
      lifespanYears: number;
    };

    // Build fresh values BEFORE calling calculate to avoid stale closure
    const freshBattery: BatteryConfig = {
      capacityKwh: d.capacityKwh,
      powerKw: d.powerKw,
      roundTripEfficiency: d.roundTripEfficiency,
      annualDegradation: d.annualDegradation,
      cycleLife: d.cycleLife,
      depthOfDischarge: d.depthOfDischarge,
      costPerKwh: d.costPerKwh,
      installationCost: d.installationCost,
      annualMaintenanceCost: d.annualMaintenanceCost,
      lifespanYears: d.lifespanYears,
    };

    const freshProfile: EnergyProfile = {
      hourlyConsumptionKwh: customHourlyProfile ?? generateHourlyProfile(d.annualConsumptionKwh, d.peakDemandKw, d.sector),
      peakDemandKw: d.peakDemandKw,
      annualConsumptionKwh: d.annualConsumptionKwh,
      connectionCapacityKw: d.connectionCapacityKw,
      sector: d.sector,
      dataSource: customHourlyProfile ? 'csv' : 'synthetic',
    };

    // Update React state (for UI display)
    setSector(d.sector);
    setAnnualConsumption(d.annualConsumptionKwh);
    setPeakDemand(d.peakDemandKw);
    setConnectionCapacity(d.connectionCapacityKw);
    setBatteryConfig(freshBattery);

    // Navigate and calculate with the FRESH values (not stale closure)
    navigate('/results');
    calculate({ batteryConfig: freshBattery, energyProfile: freshProfile });
  }

  async function handleRecommend(profileData: {
    sector: Sector;
    annualConsumptionKwh: number;
    peakDemandKw: number;
    connectionCapacityKw: number;
  }): Promise<SizingRecommendation> {
    const profile: EnergyProfile = {
      hourlyConsumptionKwh: customHourlyProfile ?? generateHourlyProfile(profileData.annualConsumptionKwh, profileData.peakDemandKw, profileData.sector),
      peakDemandKw: profileData.peakDemandKw,
      annualConsumptionKwh: profileData.annualConsumptionKwh,
      connectionCapacityKw: profileData.connectionCapacityKw,
      sector: profileData.sector,
      dataSource: customHourlyProfile ? 'csv' : 'synthetic',
    };
    return recommendViaAPI(profile, tariffs, subsidies, financials);
  }

  function handleCsvAccepted(data: {
    hourlyConsumptionKwh: number[];
    annualConsumptionKwh: number;
    peakDemandKw: number;
  }) {
    setCustomHourlyProfile(data.hourlyConsumptionKwh);
    setAnnualConsumption(data.annualConsumptionKwh);
    setPeakDemand(data.peakDemandKw);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Battery Optimizer</h1>
        <p className="mt-2 text-lg text-gray-600">
          Bereken of een investering in batterijopslag rendabel is voor uw organisatie
        </p>
      </div>

      <KwartierDataUpload
        onDataAccepted={handleCsvAccepted}
        onClear={() => setCustomHourlyProfile(null)}
        hasCustomProfile={hasCustomProfile}
      />

      <BatteryConfigurator
        defaultValues={{
          ...batteryConfig,
          sector,
          annualConsumptionKwh: annualConsumption,
          peakDemandKw: peakDemand,
          connectionCapacityKw: connectionCapacity,
        }}
        onSubmit={handleSubmit}
        onRecommend={handleRecommend}
        isCalculating={isCalculating}
        hasCustomProfile={hasCustomProfile}
      />
    </div>
  );
}
