import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeProjections } from '../src/lib/calculatorMath.ts';
import assumptionsData from '../src/config/assumptions.json' with { type: 'json' };

const assumptions = assumptionsData.industries;

test('Calculator Math: Promotions-only lead generation rule', () => {
  // Scenario 1: Without promotions, lead volume must be strictly 0
  const noPromoState = {
    budget: 100000,
    industryKey: 'healthcare_wellness',
    selectedServices: ['websites', 'gmb', 'media', 'apps', 'branding']
  };

  const outputNoPromo = computeProjections(noPromoState, assumptions);
  assert.equal(outputNoPromo.hasPromotions, false);
  assert.equal(outputNoPromo.projectedInquiriesBase, 0);
  assert.equal(outputNoPromo.projectedInquiriesLow, 0);
  assert.equal(outputNoPromo.projectedInquiriesHigh, 0);
  assert.equal(outputNoPromo.projectedImpressions, 0);

  // Scenario 2: Adding non-promotions services alongside promotions must NOT inflate inquiries
  const promoOnlyState = {
    budget: 100000,
    industryKey: 'healthcare_wellness',
    selectedServices: ['promotions']
  };
  const promoPlusOtherState = {
    budget: 100000,
    industryKey: 'healthcare_wellness',
    selectedServices: ['promotions', 'websites', 'branding']
  };

  const outputPromoOnly = computeProjections(promoOnlyState, assumptions);
  const outputPromoPlusOther = computeProjections(promoPlusOtherState, assumptions);

  assert.equal(outputPromoOnly.hasPromotions, true);
  assert.equal(outputPromoPlusOther.hasPromotions, true);
  assert.equal(outputPromoOnly.projectedInquiriesBase, outputPromoPlusOther.projectedInquiriesBase);
  assert.equal(outputPromoOnly.projectedInquiriesLow, outputPromoPlusOther.projectedInquiriesLow);
  assert.equal(outputPromoOnly.projectedInquiriesHigh, outputPromoPlusOther.projectedInquiriesHigh);
  assert.equal(outputPromoOnly.projectedImpressions, outputPromoPlusOther.projectedImpressions);
});

test('Calculator Math: Monotonicity - spend increase never lowers inquiries', () => {
  const budgets = [25000, 50000, 75000, 100000, 200000, 500000];
  const industryKeys = Object.keys(assumptions);

  for (const industryKey of industryKeys) {
    let lastBase = 0;
    let lastHigh = 0;
    let lastLow = 0;
    let lastImpressions = 0;

    for (const budget of budgets) {
      const state = {
        budget,
        industryKey,
        selectedServices: ['promotions']
      };
      const res = computeProjections(state, assumptions);

      assert.ok(
        res.projectedInquiriesBase >= lastBase,
        `For ${industryKey}, inquiries at ${budget} (${res.projectedInquiriesBase}) must be >= inquiries at previous budget (${lastBase})`
      );
      assert.ok(res.projectedInquiriesHigh >= lastHigh);
      assert.ok(res.projectedInquiriesLow >= lastLow);
      assert.ok(res.projectedImpressions >= lastImpressions);

      lastBase = res.projectedInquiriesBase;
      lastHigh = res.projectedInquiriesHigh;
      lastLow = res.projectedInquiriesLow;
      lastImpressions = res.projectedImpressions;
    }
  }
});

test('Calculator Math: Boundary ordering (High >= Base >= Low inquiries)', () => {
  for (const industryKey of Object.keys(assumptions)) {
    const state = {
      budget: 80000,
      industryKey,
      selectedServices: ['promotions']
    };
    const res = computeProjections(state, assumptions);

    assert.ok(
      res.projectedInquiriesHigh >= res.projectedInquiriesBase,
      `High estimate must be >= Base estimate for ${industryKey}`
    );
    assert.ok(
      res.projectedInquiriesBase >= res.projectedInquiriesLow,
      `Base estimate must be >= Low estimate for ${industryKey}`
    );
  }
});

test('Calculator Math: Optional ROAS and revenue projections', () => {
  const state = {
    budget: 50000,
    industryKey: 'b2b_saas_it',
    selectedServices: ['promotions'],
    saleValue: 10000,
    closeRatePct: 10 // 10%
  };

  const res = computeProjections(state, assumptions);
  assert.ok(res.projectedRevenue !== undefined && res.projectedRevenue > 0);
  assert.ok(res.projectedRoas !== undefined && res.projectedRoas > 0);

  const expectedClosed = res.projectedInquiriesBase * 0.1;
  const expectedRev = Math.round(expectedClosed * 10000);
  assert.equal(res.projectedRevenue, expectedRev);
  assert.equal(res.projectedRoas, Number((expectedRev / 50000).toFixed(2)));
});

test('Calculator Math: Fallback for unknown industry gracefully handles division', () => {
  const state = {
    budget: 50000,
    industryKey: 'non_existent_industry',
    selectedServices: ['promotions']
  };

  const res = computeProjections(state, assumptions);
  assert.equal(res.hasPromotions, true);
  assert.ok(res.projectedInquiriesBase > 0);
  assert.ok(!Number.isNaN(res.projectedInquiriesBase));
  assert.ok(Number.isFinite(res.projectedInquiriesBase));
});
