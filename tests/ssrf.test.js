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

test('SSRF: validateTargetUrl blocks decimal, hex, and non-standard web ports', async () => {
  const decCheck = await validateTargetUrl('http://2130706433', false);
  assert.equal(decCheck.valid, false);

  const hexCheck = await validateTargetUrl('http://0x7f000001', false);
  assert.equal(hexCheck.valid, false);

  const portCheck = await validateTargetUrl('https://example.com:8080', false);
  assert.equal(portCheck.valid, false);

  const protoCheck = await validateTargetUrl('ftp://example.com', false);
  assert.equal(protoCheck.valid, false);
});
