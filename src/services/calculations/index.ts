export { simulateBatteryOperation, getMonthlyBreakdown } from './battery-simulation';
export {
  calculateNPV,
  calculateIRR,
  calculateSimplePayback,
  calculateDiscountedPayback,
  calculateLCOS,
  generateCashflows,
  generateYearlyRevenueBreakdown,
} from './financial-model';
export { generateScenarios, calculateFullResult, sensitivityAnalysis } from './scenario-engine';
export { calculateSDE, calculateEIA, calculateTotalSubsidyPerYear, getEffectiveInvestment, generateSubsidySchedule } from './subsidy-calculator';
export { aggregateRegimeBreakdown } from './regime-analyzer';
export { generateHourlyProfile } from './profile-generator';
