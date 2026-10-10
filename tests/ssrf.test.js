import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateIpv4, isPrivateIpv6, normalizeNumericIp, validateTargetUrl } from '../functions/lib/ssrf.js';

test('SSRF: Normalizes numeric IPs (decimal, hex, octal)', () => {
  assert.equal(normalizeNumericIp('2130706433'), '127.0.0.1');
  assert.equal(normalizeNumericIp('0x7f000001'), '127.0.0.1');
  assert.equal(normalizeNumericIp('0177.0.0.1'), '127.0.0.1');
  assert.equal(normalizeNumericIp('google.com'), null);
});

test('SSRF: Blocks loopback IPv4 and IPv6', () => {
  assert.equal(isPrivateIpv4('127.0.0.1'), true);
  assert.equal(isPrivateIpv4('127.255.255.255'), true);
  assert.equal(isPrivateIpv6('::1'), true);
  assert.equal(isPrivateIpv6('[::1]'), true);
  assert.equal(isPrivateIpv6('::ffff:127.0.0.1'), true);
});

test('SSRF: Blocks full 172.16.0.0/12 range (172.16 - 172.31)', () => {
  assert.equal(isPrivateIpv4('172.16.0.1'), true);
  assert.equal(isPrivateIpv4('172.20.10.5'), true);
  assert.equal(isPrivateIpv4('172.31.255.254'), true);
  assert.equal(isPrivateIpv4('172.32.0.1'), false); // Public
});

test('SSRF: Blocks cloud metadata and CGNAT', () => {
  assert.equal(isPrivateIpv4('169.254.169.254'), true);
  assert.equal(isPrivateIpv4('100.64.0.1'), true);
  assert.equal(isPrivateIpv4('100.127.255.254'), true);
  assert.equal(isPrivateIpv4('10.0.0.1'), true);
  assert.equal(isPrivateIpv4('192.168.1.1'), true);
});

test('SSRF: validateTargetUrl blocks all reserved IP variations without DNS check', async () => {
  const targets = [
    'http://127.0.0.1',
    'http://[::1]',
    'http://2130706433',
    'http://0177.0.0.1',
    'http://0x7f000001',
    'http://172.16.0.1',
    'http://172.31.255.254',
    'http://169.254.169.254',
    'http://100.64.0.1',
    'http://localhost',
    'http://server.internal'
  ];

  for (const target of targets) {
    const res = await validateTargetUrl(target, false);
    assert.equal(res.valid, false, `Expected ${target} to be blocked`);
  }
});

test('SSRF: validateTargetUrl blocks non-standard web ports and non-http protocols', async () => {
  const portCheck = await validateTargetUrl('https://example.com:8080', false);
  assert.equal(portCheck.valid, false);

  const ftpCheck = await validateTargetUrl('ftp://example.com', false);
  assert.equal(ftpCheck.valid, false);

  const fileCheck = await validateTargetUrl('file:///etc/passwd', false);
  assert.equal(fileCheck.valid, false);
});

test('SSRF: validateTargetUrl permits valid public web URLs', async () => {
  // Test without DNS query (syntax/scheme/port validation)
  const validNoDns = await validateTargetUrl('https://example.com/test', false);
  assert.equal(validNoDns.valid, true);
  assert.equal(validNoDns.url, 'https://example.com/test');

  const validHttp = await validateTargetUrl('http://example.com', false);
  assert.equal(validHttp.valid, true);
  assert.equal(validHttp.url, 'http://example.com/');
});

test('SSRF: validateTargetUrl fails closed when domain is unresolvable via DoH', async () => {
  const origFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ Status: 3, Answer: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/dns-json' }
      });
    };
    const res = await validateTargetUrl('https://unresolvable-domain-xyz.com', true);
    assert.equal(res.valid, false);
    assert.ok(res.error.includes('could not be resolved'));
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('SSRF: validateTargetUrl fails closed when DoH lookup throws or times out', async () => {
  const origFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new Error('DoH Network Timeout');
    };
    const res = await validateTargetUrl('https://valid-looking-domain.com', true);
    assert.equal(res.valid, false);
    assert.ok(res.error.includes('could not be resolved'));
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('SSRF: validateTargetUrl succeeds when DoH resolves to a public IP', async () => {
  const origFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        Status: 0,
        Answer: [{ type: 1, data: '93.184.216.34' }]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/dns-json' }
      });
    };
    const res = await validateTargetUrl('https://example.com', true);
    assert.equal(res.valid, true);
    assert.equal(res.url, 'https://example.com/');
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('SSRF: validateTargetUrl blocks domain when DoH resolves to a private IP (DNS rebinding)', async () => {
  const origFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        Status: 0,
        Answer: [{ type: 1, data: '192.168.1.10' }]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/dns-json' }
      });
    };
    const res = await validateTargetUrl('https://rebind-to-private.com', true);
    assert.equal(res.valid, false);
    assert.ok(res.error.includes('restricted or private'));
  } finally {
    globalThis.fetch = origFetch;
  }
});

