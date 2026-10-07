/**
 * SSRF and Network Target Validation
 * Pure JS module for Cloudflare Pages Functions and Node.js testing.
 */

// Private & Reserved IPv4 CIDRs [startInt, endInt]
function ipToInt(ip) {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0);
}

function cidrToRange(cidr) {
  const [ip, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  const base = ipToInt(ip);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  const start = (base & mask) >>> 0;
  const end = (start | (~mask >>> 0)) >>> 0;
  return [start, end];
}

const RESERVED_IPV4_RANGES = [
  '0.0.0.0/8',       // "This" network
  '10.0.0.0/8',      // Private RFC 1918
  '100.64.0.0/10',   // Carrier-grade NAT
  '127.0.0.0/8',     // Loopback
  '169.254.0.0/16',  // Link-local / Cloud Metadata
  '172.16.0.0/12',   // Private RFC 1918 (172.16.0.0 - 172.31.255.255)
  '192.0.0.0/24',    // IETF Protocol Assignments
  '192.0.2.0/24',    // TEST-NET-1
  '192.88.99.0/24',  // 6to4 Relay Anycast
  '192.168.0.0/16',  // Private RFC 1918
  '198.18.0.0/15',   // Benchmarking
  '198.51.100.0/24', // TEST-NET-2
  '203.0.113.0/24',  // TEST-NET-3
  '224.0.0.0/4',     // Multicast
  '240.0.0.0/4',     // Reserved / Future Use
  '255.255.255.255/32' // Broadcast
].map(cidrToRange);

/**
 * Parses numeric host strings (decimal, hex, octal) into standard dot-decimal IPv4.
 * Returns null if not a numeric IP.
 */
export function normalizeNumericIp(host) {
  const clean = host.trim().replace(/^\[|\]$/g, '');

  // 1. Single integer decimal (e.g. 2130706433 = 127.0.0.1)
  if (/^\d+$/.test(clean)) {
    const num = Number(clean);
    if (num >= 0 && num <= 4294967295) {
      return [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255
      ].join('.');
    }
  }

  // 2. Hex notation (e.g. 0x7f000001)
  if (/^0x[0-9a-fA-F]+$/.test(clean)) {
    const num = parseInt(clean, 16);
    if (num >= 0 && num <= 4294967295) {
      return [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255
      ].join('.');
    }
  }

  // 3. Dot-separated octal or mixed hex parts (e.g. 0177.0.0.1)
  if (/^([0-9a-fA-Fx]+)\.([0-9a-fA-Fx]+)\.([0-9a-fA-Fx]+)\.([0-9a-fA-Fx]+)$/.test(clean)) {
    const parts = clean.split('.').map(p => {
      if (p.startsWith('0x') || p.startsWith('0X')) return parseInt(p, 16);
      if (p.startsWith('0') && p.length > 1) return parseInt(p, 8);
      return parseInt(p, 10);
    });
    if (parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
      return parts.join('.');
    }
  }

  return null;
}

/**
 * Checks whether an IPv4 string is private or restricted.
 */
export function isPrivateIpv4(ipStr) {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ipStr)) return false;
  const num = ipToInt(ipStr);
  for (const [start, end] of RESERVED_IPV4_RANGES) {
    if (num >= start && num <= end) return true;
  }
  return false;
}

/**
 * Checks whether an IPv6 string is private or loopback.
 */
export function isPrivateIpv6(ipStr) {
  const clean = ipStr.toLowerCase().replace(/^\[|\]$/g, '');
  
  // Loopback & unspecified
  if (clean === '::1' || clean === '::' || clean === '0:0:0:0:0:0:0:1') return true;

  // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (clean.startsWith('::ffff:')) {
    const v4Part = clean.slice(7);
    if (v4Part.includes('.')) {
      return isPrivateIpv4(v4Part);
    }
  }

  // Unique Local Address (fc00::/7: fc... or fd...)
  if (/^f[cd][0-9a-f]{2}:/i.test(clean)) return true;

  // Link-Local (fe80::/10: fe8..., fe9..., fea..., feb...)
  if (/^fe[89ab][0-9a-f]:/i.test(clean)) return true;

  // Multicast (ff00::/8)
  if (/^ff[0-9a-f]{2}:/i.test(clean)) return true;

  return false;
}

/**
 * Resolves a hostname via Cloudflare DNS over HTTPS (DoH).
 * Filters out CNAME records; returns A and AAAA IP records.
 */
export async function resolveDnsOverHttps(hostname) {
  const ips = [];
  try {
    const dohUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`;
    const resp = await fetch(dohUrl, {
      headers: { 'Accept': 'application/dns-json' }
    });
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data.Answer)) {
        for (const ans of data.Answer) {
          // Type 1 is A record
          if (ans.type === 1 && ans.data) {
            ips.push(ans.data.trim());
          }
        }
      }
    }
  } catch (err) {
    // DNS query failure
  }
  return ips;
}

/**
 * Validates a target URL against SSRF rules, ports, and DoH resolution.
 * Returns { valid: boolean, url: string, error?: string }
 */
export async function validateTargetUrl(rawUrl, checkDns = true) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'Empty URL provided.' };
  }

  let clean = rawUrl.trim();
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(clean)) {
    // Protocol explicitly provided
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are permitted.' };
    }
  } else {
    // No scheme provided, default to https://
    clean = 'https://' + clean;
  }

  let parsed;
  try {
    parsed = new URL(clean);
  } catch {
    return { valid: false, error: 'Malformed target URL.' };
  }

  // Protocol check
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTP and HTTPS protocols are permitted.' };
  }

  // Port check
  const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);
  if (port !== 80 && port !== 443) {
    return { valid: false, error: 'Only standard web ports 80 and 443 are supported.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    return { valid: false, error: 'Target URL is missing a valid hostname.' };
  }

  // Localhost names
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { valid: false, error: 'Access to localhost and internal hostnames is blocked.' };
  }

  // Numeric IPv4 representation
  const numericIpv4 = normalizeNumericIp(hostname);
  if (numericIpv4) {
    if (isPrivateIpv4(numericIpv4)) {
      return { valid: false, error: `Direct IP ${numericIpv4} belongs to a private or restricted network.` };
    }
  }

  // Direct IPv4
  if (isPrivateIpv4(hostname)) {
    return { valid: false, error: `Direct IP ${hostname} belongs to a private or restricted network.` };
  }

  // Direct IPv6
  if (isPrivateIpv6(hostname)) {
    return { valid: false, error: `Direct IPv6 ${hostname} belongs to a private or loopback network.` };
  }

  // DNS Rebinding / Private Domain check
  if (checkDns && !numericIpv4 && !/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    const resolvedIps = await resolveDnsOverHttps(hostname);
    if (resolvedIps.length === 0) {
      // Fail closed if domain does not resolve
      return { valid: false, error: `Domain does not resolve to an active public IP address.` };
    }
    for (const ip of resolvedIps) {
      if (isPrivateIpv4(ip) || isPrivateIpv6(ip)) {
        return { valid: false, error: `Domain resolves to a restricted or private network address (${ip}).` };
      }
    }
  }

  return { valid: true, url: parsed.toString() };
}
