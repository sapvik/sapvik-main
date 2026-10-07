/**
 * Pure Math Logic for SAPVIK Growth Simulator
 * Unit-testable without DOM or React dependencies.
 */

export interface IndustryAssumption {
  name: string;
  cpl_low: number;
  cpl_base: number;
  cpl_high: number;
  cpm_base: number;
  typical_close_rate: number;
  typical_ticket: number;
  source: string;
}

export interface CalculatorState {
  budget: number; // in INR (e.g. 25000 to 500000)
  industryKey: string;
  selectedServices: string[]; // e.g. ['websites', 'promotions', 'gmb']
  saleValue?: number;
  closeRatePct?: number; // 0 to 100
}

export interface CalculatorOutput {
  hasPromotions: boolean;
  projectedImpressions: number;
  projectedInquiriesLow: number;
  projectedInquiriesBase: number;
  projectedInquiriesHigh: number;
  projectedRevenue?: number;
  projectedRoas?: number;
}

export function computeProjections(
  state: CalculatorState,
  assumptions: Record<string, IndustryAssumption>
): CalculatorOutput {
  const { budget, industryKey, selectedServices, saleValue, closeRatePct } = state;
  const industry = assumptions[industryKey] || {
    name: "General Commercial",
    cpl_low: 380,
    cpl_base: 600,
    cpl_high: 900,
    cpm_base: 180,
    typical_close_rate: 0.2,
    typical_ticket: 8000,
    source: "placeholder"
  };

  const hasPromotions = selectedServices.includes('promotions');

  // Rule: Only Digital Promotions directly produces ad impressions and inquiries
  if (!hasPromotions) {
    return {
      hasPromotions: false,
      projectedImpressions: 0,
      projectedInquiriesLow: 0,
      projectedInquiriesBase: 0,
      projectedInquiriesHigh: 0
    };
  }

  // Impressions = (Budget / CPM) * 1000
  const cpm = Math.max(10, industry.cpm_base);
  const projectedImpressions = Math.round((budget / cpm) * 1000);

  // Inquiries = Budget / CPL
  const projectedInquiriesHigh = Math.round(budget / Math.max(1, industry.cpl_low));
  const projectedInquiriesBase = Math.round(budget / Math.max(1, industry.cpl_base));
  const projectedInquiriesLow = Math.round(budget / Math.max(1, industry.cpl_high));

  let projectedRevenue: number | undefined;
  let projectedRoas: number | undefined;

  // Optional ROAS computation if customer ticket & close rate are provided
  if (saleValue && saleValue > 0 && typeof closeRatePct === 'number' && closeRatePct > 0) {
    const closedDeals = projectedInquiriesBase * (closeRatePct / 100);
    projectedRevenue = Math.round(closedDeals * saleValue);
    projectedRoas = Number((projectedRevenue / budget).toFixed(2));
  }

  return {
    hasPromotions: true,
    projectedImpressions,
    projectedInquiriesLow,
    projectedInquiriesBase,
    projectedInquiriesHigh,
    projectedRevenue,
    projectedRoas
  };
}
