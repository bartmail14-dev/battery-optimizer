import ExcelJS from 'exceljs';
import type {
  CalculationResult, BatteryConfig, EnergyProfile,
  TariffStructure, SubsidyConfig, FinancialParams,
  SensitivityDataPoint, ExcelExportConfig,
} from '../../types';
import { createSummarySheet } from './sheets/summary';
import { createDcfSheet } from './sheets/dcf-model';
import { createSensitivitySheet } from './sheets/sensitivity';
import { createAssumptionsSheet } from './sheets/assumptions';
import { createMonthlySheet } from './sheets/monthly';

interface ExcelExportData {
  config: ExcelExportConfig;
  results: CalculationResult;
  battery: BatteryConfig;
  profile: EnergyProfile;
  tariffs: TariffStructure;
  subsidies: SubsidyConfig;
  financials: FinancialParams;
  sensitivity: SensitivityDataPoint[];
}

export async function generateExcel(data: ExcelExportData): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'COMCAM Battery Optimizer';
  wb.created = new Date();

  // Sheet 1: Samenvatting
  const summaryWs = wb.addWorksheet('Samenvatting');
  createSummarySheet(summaryWs, {
    clientName: data.config.clientName,
    projectRef: data.config.projectRef ?? '',
    results: data.results,
    battery: data.battery,
    profile: data.profile,
    financials: data.financials,
  });

  // Sheet 2: DCF Model
  const dcfWs = wb.addWorksheet('DCF Model');
  createDcfSheet(dcfWs, {
    results: data.results,
    financials: data.financials,
  });

  // Sheet 3: Gevoeligheid
  const sensWs = wb.addWorksheet('Gevoeligheid');
  createSensitivitySheet(sensWs, {
    results: data.results,
    sensitivity: data.sensitivity,
  });

  // Sheet 4: Aannames
  const assumpWs = wb.addWorksheet('Aannames');
  createAssumptionsSheet(assumpWs, {
    battery: data.battery,
    profile: data.profile,
    tariffs: data.tariffs,
    subsidies: data.subsidies,
    financials: data.financials,
  });

  // Sheet 5: Maandoverzicht
  const monthlyWs = wb.addWorksheet('Maandoverzicht');
  createMonthlySheet(monthlyWs, data.results.monthlyBreakdown);

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export async function downloadExcel(data: ExcelExportData): Promise<void> {
  const blob = await generateExcel(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const clientSlug = data.config.clientName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  link.download = `COMCAM-Excel-${clientSlug}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
