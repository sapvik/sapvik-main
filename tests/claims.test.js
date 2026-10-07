import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Claims Integrity: No unverified claims or untracked metrics in HTML', () => {
  const claimsPath = path.join(__dirname, '..', 'public', 'config', 'claims.json');
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');

  assert.ok(fs.existsSync(claimsPath), 'public/config/claims.json must exist');
  assert.ok(fs.existsSync(indexPath), 'public/index.html must exist');

  const claimsData = JSON.parse(fs.readFileSync(claimsPath, 'utf8'));
  const htmlContent = fs.readFileSync(indexPath, 'utf8');

  // Rule 1: Every claim in claims.json marked verified: false must NOT appear in the HTML
  for (const claim of claimsData.claims || []) {
    if (claim.verified === false) {
      if (htmlContent.includes(claim.statement)) {
        assert.fail(`Unverified claim "${claim.statement}" (id: ${claim.id}) is present in index.html! All published claims must be verified.`);
      }
    } else {
      // Verified claims must have evidence
      assert.ok(claim.evidence && claim.evidence.length > 5, `Verified claim "${claim.id}" must have an evidence link.`);
      assert.ok(claim.last_updated, `Verified claim "${claim.id}" must have a last_updated date.`);
    }
  }

  // Rule 2: Deprecated unverified marketing claims must NOT be in public/index.html
  const forbiddenClaims = [
    '4.2x',
    '4.8x',
    '+310%',
    '#1 Rank',
    '14 hrs / wk'
  ];

  for (const forbidden of forbiddenClaims) {
    if (htmlContent.includes(forbidden)) {
      assert.fail(`Found unverified/invented metric claim "${forbidden}" in index.html.`);
    }
  }
});
