import { Document, pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import type { FullReportData } from '../../types';
import { createCoverPage } from './pages/cover-page';
import { createManagementSummary } from './pages/management-summary';
import { createFinancialOverview, createDcfPage } from './pages/financial-overview';
import { createRevenueSourcesPage } from './pages/revenue-sources';
import { createScenarioPage } from './pages/scenario-comparison';
import { createSensitivityPage } from './pages/sensitivity-page';
import { createSubsidyOverview } from './pages/subsidy-overview';
import { createTechnicalSpecs } from './pages/technical-specs';
import { createOperationalProfile } from './pages/operational-profile';
import { createRiskAssessment } from './pages/risk-assessment';
import { createCO2Impact } from './pages/co2-impact';
import { createAssumptionsPage } from './pages/assumptions';
import { createAiAnalysisPage } from './pages/ai-analysis';
import { createCtaPage } from './pages/cta-page';

export async function generateFullReport(data: FullReportData): Promise<Blob> {
  const reportDate = data.config.reportDate ?? new Date().toLocaleDateString('nl-NL');
  const includeAi = data.config.includeAiAnalysis && data.config.aiReportText;
  const totalPages = includeAi ? 15 : 14;

  let page = 1;

  const pages = [
    createCoverPage(data.config),                                     // p1 (no header)
    createManagementSummary(data, ++page, totalPages),                // p2
    createFinancialOverview(data, ++page, totalPages),                // p3
    createDcfPage(data, ++page, totalPages),                          // p4
    createRevenueSourcesPage(data, ++page, totalPages),               // p5
    createScenarioPage(data, ++page, totalPages),                     // p6
    createSensitivityPage(data, ++page, totalPages),                  // p7
    createSubsidyOverview(data, ++page, totalPages),                  // p8
    createTechnicalSpecs(data, ++page, totalPages),                   // p9
    createOperationalProfile(data, ++page, totalPages),               // p10
    createRiskAssessment(data, ++page, totalPages),                   // p11
    createCO2Impact(data, ++page, totalPages),                        // p12
    createAssumptionsPage(data, ++page, totalPages),                  // p13
  ];

  if (includeAi) {
    pages.push(createAiAnalysisPage(data.config.aiReportText!, reportDate, ++page, totalPages)); // p14
  }

  pages.push(createCtaPage()); // last page

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = createElement(Document, null, ...pages) as any;
  return await pdf(doc).toBlob();
}

export async function downloadFullReport(data: FullReportData): Promise<void> {
  const blob = await generateFullReport(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const clientSlug = data.config.clientName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  link.download = `COMCAM-Rapport-${clientSlug}-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
