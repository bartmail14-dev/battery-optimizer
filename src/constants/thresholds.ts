export const METRIC_THRESHOLDS = {
  payback: { positive: 7, neutral: 12, maxAcceptable: 10 },  // jaren; maxAcceptable = go/no-go grens
  npv: { positive: 10000, neutral: 0 },      // EUR
  irr: { positive: 0.08, neutral: 0.04, wacc: 0.06 },  // ratio; wacc = referentie WACC voor uitleg
  savings: { positive: 5000, neutral: 0 },    // EUR
};
