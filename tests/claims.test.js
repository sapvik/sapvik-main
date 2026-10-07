import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Claims Integrity: src/config/claims.json conforms to strict verification rules', () => {
  const claimsPath = path.join(__dirname, '..', 'src', 'config', 'claims.json');
  assert.ok(fs.existsSync(claimsPath), 'src/config/claims.json must exist');

  const claimsData = JSON.parse(fs.readFileSync(claimsPath, 'utf8'));
  assert.ok(Array.isArray(claimsData.claims), 'claims must be an array');

  for (const claim of claimsData.claims) {
    assert.ok(claim.id, 'Every claim must have an id');
    assert.ok(claim.statement, 'Every claim must have a statement');
    assert.ok(claim.claim_text, 'Every claim must have claim_text');
    assert.ok(typeof claim.verified === 'boolean', 'Every claim must have a boolean verified property');
    assert.ok(claim.last_updated, 'Every claim must have last_updated');

    if (claim.verified) {
      assert.ok(claim.evidence && claim.evidence.length > 5, `Verified claim "${claim.id}" must cite evidence`);
    }
  }

  // Ensure unverified claims are explicitly verified: false
  const unverifiedLcp = claimsData.claims.find(c => c.id === 'claim_unverified_lcp_guarantee');
  assert.ok(unverifiedLcp);
  assert.equal(unverifiedLcp.verified, false);

  const unverifiedMarkup = claimsData.claims.find(c => c.id === 'claim_unverified_zero_markup');
  assert.ok(unverifiedMarkup);
  assert.equal(unverifiedMarkup.verified, false);
});

test('Claims Integrity: src/config/assumptions.json marks all industry sources as placeholder', () => {
  const assumptionsPath = path.join(__dirname, '..', 'src', 'config', 'assumptions.json');
  assert.ok(fs.existsSync(assumptionsPath), 'src/config/assumptions.json must exist');

  const data = JSON.parse(fs.readFileSync(assumptionsPath, 'utf8'));
  assert.equal(data.calculator_type, 'illustrative_simulator');

  for (const [key, industry] of Object.entries(data.industries)) {
    assert.equal(
      industry.source,
      'placeholder',
      `Industry "${key}" source must be strictly "placeholder" until live campaign data is approved`
    );
    assert.ok(industry.cpl_base > 0);
    assert.ok(industry.cpm_base > 0);
  }
});
