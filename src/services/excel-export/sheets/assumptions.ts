import type { Worksheet } from 'exceljs';
import type { BatteryConfig, EnergyProfile, TariffStructure, SubsidyConfig, FinancialParams } from '../../../types';
import { headerFill, headerFont, titleFont, bodyFont, cellBorders, lightFill } from '../styles';

interface AssumptionsSheetData {
  battery: BatteryConfig;
  profile: EnergyProfile;
  tariffs: TariffStructure;
  subsidies: SubsidyConfig;
  financials: FinancialParams;
}

export function createAssumptionsSheet(ws: Worksheet, data: AssumptionsSheetData) {
  ws.columns = [
    { width: 30 },
    { width: 25 },
  ];

  let row = 1;

  ws.getCell(row, 1).value = 'Aannames';
  ws.getCell(row, 1).font = titleFont;
  ws.mergeCells(row, 1, row, 2);
  row += 2;

  function addSection(title: string, items: Array<[string, string | number]>) {
    const headerCell = ws.getCell(row, 1);
    headerCell.value = title;
    headerCell.font = headerFont;
    headerCell.fill = headerFill;
    ws.getCell(row, 2).font = headerFont;
    ws.getCell(row, 2).fill = headerFill;
    ws.getCell(row, 1).border = cellBorders;
    ws.getCell(row, 2).border = cellBorders;
    row++;

    items.forEach(([label, value], i) => {
      ws.getCell(row, 1).value = label;
      ws.getCell(row, 1).font = bodyFont;
      ws.getCell(row, 1).border = cellBorders;
      ws.getCell(row, 1).fill = i % 2 === 0 ? lightFill : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };

      ws.getCell(row, 2).value = value;
      ws.getCell(row, 2).font = { ...bodyFont, bold: true };
      ws.getCell(row, 2).border = cellBorders;
      ws.getCell(row, 2).fill = i % 2 === 0 ? lightFill : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
      row++;
    });

    row++;
  }

  addSection('Batterij', [
    ['Capaciteit', `${data.battery.capacityKwh} kWh`],
    ['Vermogen', `${data.battery.powerKw} kW`],
    ['Round-trip efficiency', `${(data.battery.roundTripEfficiency * 100).toFixed(1)}%`],
    ['Jaarlijkse degradatie', `${(data.battery.annualDegradation * 100).toFixed(1)}%`],
    ['Cycluslevensduur', `${data.battery.cycleLife} cycli`],
    ['Depth of Discharge', `${(data.battery.depthOfDischarge * 100).toFixed(0)}%`],
    ['Kosten per kWh', `\u20AC ${data.battery.costPerKwh}`],
    ['Installatiekosten', `\u20AC ${data.battery.installationCost.toLocaleString('nl-NL')}`],
    ['Jaarlijks onderhoud', `\u20AC ${data.battery.annualMaintenanceCost.toLocaleString('nl-NL')}`],
    ['Levensduur', `${data.battery.lifespanYears} jaar`],
  ]);

  addSection('Energieprofiel', [
    ['Sector', data.profile.sector],
    ['Jaarverbruik', `${(data.profile.annualConsumptionKwh / 1000).toFixed(0)} MWh`],
    ['Piekvraag', `${data.profile.peakDemandKw} kW`],
    ['Aansluitcapaciteit', `${data.profile.connectionCapacityKw} kW`],
    ['Databron', data.profile.dataSource === 'csv' ? 'CSV-upload' : 'Synthetisch profiel'],
  ]);

  addSection('Tarieven', [
    ['Tariefmodel', data.tariffs.pricingMode === 'dynamic' ? 'Dynamisch (EPEX)' : 'Vast piek/dal'],
    ['Piektarief', `\u20AC ${data.tariffs.peakRate.toFixed(4)}/kWh`],
    ['Daltarief', `\u20AC ${data.tariffs.offPeakRate.toFixed(4)}/kWh`],
    ['Netwerktarief', `\u20AC ${data.tariffs.networkTariffPerKw.toFixed(2)}/kW/jaar`],
    ['Energiebelasting', `\u20AC ${data.tariffs.energyTaxPerKwh.toFixed(5)}/kWh`],
    ['ODE-toeslag', `\u20AC ${data.tariffs.odeSurchargePerKwh.toFixed(5)}/kWh`],
  ]);

  addSection('Subsidies', [
    ['SDE++ geschikt', data.subsidies.sdeEligible ? 'Ja' : 'Nee'],
    ['SDE++ basisbedrag', `\u20AC ${data.subsidies.sdeBaseAmount.toFixed(3)}/kWh`],
    ['EIA percentage', `${(data.subsidies.eiaPercentage * 100).toFixed(1)}%`],
    ['EIA maximale aftrek', `\u20AC ${data.subsidies.eiaMaxDeduction.toLocaleString('nl-NL')}`],
  ]);

  addSection('Financieel', [
    ['Discontovoet (WACC)', `${(data.financials.discountRate * 100).toFixed(1)}%`],
    ['Inflatie', `${(data.financials.inflationRate * 100).toFixed(1)}%`],
    ['Energieprijsstijging', `${(data.financials.electricityPriceGrowthRate * 100).toFixed(1)}%`],
    ['Analyseperiode', `${data.financials.years} jaar`],
  ]);
}
