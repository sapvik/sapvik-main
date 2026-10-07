/**
 * Integration Test Script against Live Wrangler Pages Dev Runtime
 * Tests real Cloudflare Pages Functions (/api/audit, /api/contact, /_middleware.js)
 */

import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_URL || 'http://127.0.0.1:8082';
const AUTH_COOKIE = 'sapvik_auth=14b3462340e0b0e3f6b99b0600d4f018ca8409acac51fddc1c17bc8120ad13b9';

async function runIntegration() {
  console.log(`Running Wrangler Pages Functions Integration Tests against: ${BASE_URL}`);

  // 1. Verify Edge Password Gate blocks unauthenticated requests
  console.log('1. Testing Edge Middleware Gate...');
  const unauthRes = await fetch(`${BASE_URL}/api/audit`);
  assert.equal(unauthRes.status, 401, 'Expected unauthenticated request to be blocked by gate (401)');
  console.log('   ✓ Edge Gate blocks unauthenticated requests');

  // 2. Test /api/audit with auth cookie: method enforcement
  console.log('2. Testing /api/audit method enforcement...');
  const getAuditRes = await fetch(`${BASE_URL}/api/audit`, {
    method: 'GET',
    headers: { 'Cookie': AUTH_COOKIE }
  });
  assert.equal(getAuditRes.status, 405, 'Expected GET /api/audit to return 405 Method Not Allowed');
  console.log('   ✓ GET /api/audit returns 405');

  // 3. Test /api/audit with auth cookie: SSRF block
  console.log('3. Testing /api/audit SSRF protection...');
  const ssrfAuditRes = await fetch(`${BASE_URL}/api/audit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': AUTH_COOKIE
    },
    body: JSON.stringify({ url: 'http://127.0.0.1' })
  });
  assert.equal(ssrfAuditRes.status, 400, 'Expected SSRF target to return 400');
  const ssrfData = await ssrfAuditRes.json();
  assert.equal(ssrfData.error, 'invalid_target');
  assert.equal(ssrfData.has_ssl, null);
  console.log('   ✓ POST /api/audit blocks loopback SSRF target');

  // 4. Test /api/contact: origin check
  console.log('4. Testing /api/contact origin protection...');
  const evilOriginRes = await fetch(`${BASE_URL}/api/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': AUTH_COOKIE,
      'Origin': 'https://evil-phishing-site.com'
    },
    body: JSON.stringify({ name: 'User', phone: '+91 98765 00000', email: 'test@brand.com', consent: true })
  });
  assert.equal(evilOriginRes.status, 403, 'Expected cross-origin request to be rejected with 403');
  console.log('   ✓ POST /api/contact rejects foreign Origin');

  // 5. Test /api/contact: delivery guarantee and WhatsApp fallback
  console.log('5. Testing /api/contact delivery guarantee...');
  const contactRes = await fetch(`${BASE_URL}/api/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': AUTH_COOKIE,
      'Origin': 'http://127.0.0.1:8082'
    },
    body: JSON.stringify({
      name: 'Integration Test Lead',
      phone: '+91 98765 22222',
      email: 'integration@testcompany.in',
      business: 'Integration Test Co',
      service: 'Websites Development',
      consent: true
    })
  });
  assert.equal(contactRes.status, 503, 'Expected 503 when live delivery keys not configured');
  const contactData = await contactRes.json();
  assert.equal(contactData.ok, false);
  assert.equal(contactData.error, 'delivery_offline');
  assert.equal(contactData.whatsapp_fallback, true);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.ok(uuidRegex.test(contactData.lead_id), 'Expected valid RFC 4122 UUID lead_id');
  console.log(`   ✓ POST /api/contact generates UUID (${contactData.lead_id}) and enforces delivery guarantee`);

  console.log('\nAll Wrangler Pages Functions integration tests PASSED successfully.');
}

runIntegration().catch(err => {
  console.error('\nIntegration test failed:', err);
  process.exit(1);
});
