import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHtmlSnippet, executeLiveScan } from '../functions/lib/scanner.js';

test('Scanner: GA4 detection does NOT match bare g-recaptcha class or padding CSS', () => {
  const htmlWithoutGa = '<html><head></head><body><div class="g-recaptcha" data-sitekey="xyz"></div><p style="padding-top: 10px; margin-left: 5px;">Hello</p></body></html>';
  const result = analyzeHtmlSnippet(htmlWithoutGa, 'https://example.com', 350, true, true);
  assert.equal(result.has_analytics, false);
  const analyticsFinding = result.findings.find(f => f.id === 'analytics_missing');
  assert.ok(analyticsFinding, 'Expected analytics_missing finding to fire');
  assert.ok(analyticsFinding.evidence, 'Expected evidence field on finding');
});

test('Scanner: GA4 detection matches valid gtag config and GTM', () => {
  const htmlWithGtag = '<html><head><script>gtag("config", "G-ABC1234567");</script></head><body></body></html>';
  const result = analyzeHtmlSnippet(htmlWithGtag, 'https://example.com', 250, true, true);
  assert.equal(result.has_analytics, true);
});

test('Scanner: LocalBusiness schema does NOT match plain "restore storefront"', () => {
  const htmlWithoutSchema = '<html><body><p>We restore vintage cars at our storefront in Mumbai.</p></body></html>';
  const result = analyzeHtmlSnippet(htmlWithoutSchema, 'https://example.com', 250, true, true);
  assert.equal(result.has_schema, false);
});

test('Scanner: Meta pixel missing is informational, not critical', () => {
  const htmlWithoutPixel = '<html><head></head><body><p>Test</p></body></html>';
  const result = analyzeHtmlSnippet(htmlWithoutPixel, 'https://example.com', 250, true, true);
  const pixelFinding = result.findings.find(f => f.id === 'pixel_missing');
  assert.ok(pixelFinding);
  assert.equal(pixelFinding.severity, 'info');
  assert.ok(pixelFinding.evidence);
});

test('Scanner: Every finding object contains { id, severity, title, evidence, fix }', () => {
  const sampleHtml = '<html><head><title>Test</title></head><body><p>Clean page</p></body></html>';
  const result = analyzeHtmlSnippet(sampleHtml, 'https://example.com', 450, true, true);
  assert.ok(result.findings.length > 0);
  for (const f of result.findings) {
    assert.ok(f.id, 'Finding missing id');
    assert.ok(f.severity, 'Finding missing severity');
    assert.ok(f.title, 'Finding missing title');
    assert.ok(f.evidence, 'Finding missing evidence');
    assert.ok(f.fix, 'Finding missing fix');
  }
});

test('Scanner: executeLiveScan returns honest timeout error on abort', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    };
    const result = await executeLiveScan('https://timeout-domain.com');
    assert.equal(result.success, false);
    assert.equal(result.error, 'timeout');
    assert.equal(result.has_ssl, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Scanner: executeLiveScan returns honest dns_unavailable error', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new Error('getaddrinfo ENOTFOUND non-existent-domain-xyz.com');
    };
    const result = await executeLiveScan('https://non-existent-domain-xyz.com');
    assert.equal(result.success, false);
    assert.equal(result.error, 'dns_unavailable');
    assert.equal(result.has_ssl, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Scanner: executeLiveScan returns blocked_by_target on HTTP 403', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      return new Response('Forbidden', { status: 403 });
    };
    const result = await executeLiveScan('https://protected-domain.com');
    assert.equal(result.success, false);
    assert.equal(result.error, 'blocked_by_target');
    assert.equal(result.has_ssl, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Scanner: executeLiveScan returns unreachable on thrown network error', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new Error('Connection refused by peer');
    };
    const result = await executeLiveScan('https://unreachable-domain.com');
    assert.equal(result.success, false);
    assert.equal(result.error, 'unreachable');
    assert.equal(result.has_ssl, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Scanner: executeLiveScan blocks redirect to loopback 127.0.0.1 with ssrf_blocked', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      return new Response(null, {
        status: 302,
        headers: { Location: 'http://127.0.0.1/admin' }
      });
    };
    const result = await executeLiveScan('http://redirector-domain.com');
    assert.equal(result.success, false);
    assert.equal(result.error, 'ssrf_blocked');
    assert.equal(result.has_ssl, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Scanner: executeLiveScan falls back to HTTP and marks has_ssl false if HTTPS fails', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      const targetStr = String(url);
      if (targetStr.startsWith('https://')) {
        throw new Error('SSL connection failed');
      }
      return new Response('<html><head><title>Plain HTTP Site</title></head><body><h1>Welcome</h1></body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    };
    const result = await executeLiveScan('https://plain-http-domain.com');
    assert.equal(result.success, true);
    assert.equal(result.has_ssl, false);
    const sslFinding = result.findings.find(f => f.id === 'ssl_missing');
    assert.ok(sslFinding, 'Expected ssl_missing finding when has_ssl is false');
    assert.equal(sslFinding.severity, 'critical');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Scanner: executeLiveScan returns empty_response error when server returns empty body', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      return new Response('', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    };
    const result = await executeLiveScan('https://empty-parked-domain.com');
    assert.equal(result.success, false);
    assert.equal(result.error, 'empty_response');
    assert.ok(result.message.includes('empty or unparseable response'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Scanner: executeLiveScan returns parked_or_empty_domain when server returns HTML with no title, h1, or text', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      return new Response('<html><head></head><body><script src="tracking.js"></script></body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    };
    const result = await executeLiveScan('https://parked-gateway-domain.com');
    assert.equal(result.success, false);
    assert.equal(result.error, 'parked_or_empty_domain');
    assert.ok(result.message.includes('no active website content was found'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Scanner: noindex directive produces a critical severity finding and sorts first', () => {
  const htmlWithNoindex = '<html><head><title>Staging Site Title</title><meta name="robots" content="noindex, nofollow"></head><body><h1>Under Construction</h1><p>Private content</p></body></html>';
  const result = analyzeHtmlSnippet(htmlWithNoindex, 'https://example.com', 200, true, true);
  const noindexFinding = result.findings.find(f => f.id === 'noindex_detected');
  assert.ok(noindexFinding, 'Expected noindex_detected finding to fire');
  assert.equal(noindexFinding.severity, 'critical');
  assert.equal(result.findings[0].severity, 'critical');
});

test('Scanner: Content structure breakdown evaluates hierarchy, semantic landmarks, and copy length', () => {
  const richHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Full Service Digital Agency with Excellent Copy</title>
    </head>
    <body>
      <header><nav><a href="/">Home</a></nav></header>
      <main>
        <h1>Performance Engineering & Growth Marketing</h1>
        <h2>Scalable Architecture for Growing Brands</h2>
        <p>
          We build verified high-performance websites and organic search engines that transform traffic into revenue.
          Our battle-tested engineers and technical SEO consultants ensure every asset loads in milliseconds,
          maintains perfect search hygiene, and captures high-intent local customers across any market.
        </p>
      </main>
      <footer><p>&copy; 2026 Sapvik Digital</p></footer>
    </body>
    </html>
  `;
  const result = analyzeHtmlSnippet(richHtml, 'https://example.com', 200, true, true);
  // Viewport (5) + H1 & H2 (10) + semantic layout (5) + body copy >200 chars (5) = 25
  assert.equal(result.breakdown.content.score, 25, 'Expected full 25/25 for complete semantic content structure');

  // Test site without H1 but with H2, semantic tag, and >50 chars text
  const partialHtml = `
    <html>
    <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body>
      <main>
        <h2>Catalog Overview</h2>
        <p>Short snippet of text describing items in our local store catalog today.</p>
      </main>
    </body>
    </html>
  `;
  const partialResult = analyzeHtmlSnippet(partialHtml, 'https://example.com', 200, true, true);
  // Viewport (5) + H2 fallback (4) + semantic main (5) + body copy >50 chars (3) = 17
  assert.equal(partialResult.breakdown.content.score, 17, 'Expected 17 instead of collapsing to 10');
});



