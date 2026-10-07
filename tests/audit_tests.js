const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8081;

function makeRequest(method, pathName, postData = null) {
  return new Promise((resolve, reject) => {
    const payload = postData ? JSON.stringify(postData) : null;
    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: pathName,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(body); } catch(e) {}
        resolve({ statusCode: res.statusCode, body, json: parsed });
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- SAPVIK TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Static asset delivery
  await test('GET / returns 200 OK', async () => {
    const res = await makeRequest('GET', '/');
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
  });

  await test('GET /css/styles.css returns 200 OK', async () => {
    const res = await makeRequest('GET', '/css/styles.css');
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
  });

  await test('GET /privacy.html returns 200 OK', async () => {
    const res = await makeRequest('GET', '/privacy.html');
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
  });

  await test('GET /terms.html returns 200 OK', async () => {
    const res = await makeRequest('GET', '/terms.html');
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
  });

  await test('GET /cookies.html returns 200 OK', async () => {
    const res = await makeRequest('GET', '/cookies.html');
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
  });

  await test('GET /sitemap.xml has no hash fragments', async () => {
    const res = await makeRequest('GET', '/sitemap.xml');
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
    if (res.body.includes('#')) throw new Error('Sitemap still contains invalid hash fragments');
  });

  // 2. SSRF Protection Tests
  await test('SSRF blocked on 127.0.0.1', async () => {
    const res = await makeRequest('GET', '/api/audit?url=http://127.0.0.1:8081');
    if (res.statusCode !== 400 || !res.json || res.json.error !== 'invalid_target') {
      throw new Error(`Expected 400 invalid_target, got ${res.statusCode}`);
    }
  });

  await test('SSRF blocked on 169.254.169.254 (Cloud metadata)', async () => {
    const res = await makeRequest('GET', '/api/audit?url=http://169.254.169.254');
    if (res.statusCode !== 400 || !res.json || res.json.error !== 'invalid_target') {
      throw new Error(`Expected 400 invalid_target, got ${res.statusCode}`);
    }
  });

  // 3. Contact Pipeline Tests
  await test('POST /api/contact validates required email', async () => {
    const res = await makeRequest('POST', '/api/contact', {
      name: 'John Doe',
      phone: '+91 9999999999'
      // missing email
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}`);
  });

  await test('POST /api/contact captures verified lead', async () => {
    const res = await makeRequest('POST', '/api/contact', {
      name: 'Dr. Kailash Sharma',
      phone: '+91 98200 12345',
      email: 'dr.kailash@cliniccare.in',
      business: 'Kailash Specialty Clinic',
      website: 'https://kailashclinic.in',
      service: 'gmb',
      details: 'Looking to expand local 3-pack visibility across South Delhi.'
    });
    if (res.statusCode !== 200 || !res.json || !res.json.ok || !res.json.lead_id) {
      throw new Error(`Failed to capture lead: ${JSON.stringify(res.json)}`);
    }
  });

  // 4. Placeholder Number Check
  await test('Zero placeholder phone numbers (9876543210) in public/ directory', async () => {
    function searchDir(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          searchDir(fullPath);
        } else if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('9876543210')) {
            throw new Error(`Found placeholder phone in ${fullPath}`);
          }
        }
      }
    }
    searchDir(path.join(__dirname, '..', 'public'));
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
