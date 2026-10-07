export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const targetParam = url.searchParams.get("url");

  if (!targetParam) {
    return new Response(JSON.stringify({ success: false, error: "missing_url", message: "Target URL parameter required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  let cleanTarget = targetParam.trim();
  if (!cleanTarget.startsWith("http://") && !cleanTarget.startsWith("https://")) {
    cleanTarget = "https://" + cleanTarget;
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(cleanTarget);
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "invalid_url", message: "Malformed target URL." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // SSRF Protection
  const hostname = parsedTarget.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("172.16.") ||
    hostname === "169.254.169.254"
  ) {
    return new Response(JSON.stringify({ success: false, error: "invalid_target", message: "Private and local loopback destinations are restricted." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const startTime = Date.now();
    const fetchResp = await fetch(cleanTarget, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SAPVIK-Probe/2.0"
      },
      cf: {
        timeout: 8
      }
    });

    const elapsedMs = Date.now() - startTime;
    const html = (await fetchResp.text()).slice(0, 1000000).toLowerCase();

    const hasSsl = fetchResp.url.startsWith("https://");
    const hasSchema = html.includes("schema.org") || html.includes("application/ld+json");
    const hasLocalSchema = html.includes("localbusiness") || html.includes("store");
    const hasGtm = html.includes("googletagmanager.com") || html.includes("gtm-");
    const hasGa4 = html.includes("gtag(") || html.includes("g-");
    const hasPixel = html.includes("fbevents.js") || html.includes("connect.facebook.net");
    const hasViewport = html.includes('name="viewport"') || html.includes("name='viewport'");

    // Score calculation
    let score = 25;
    if (elapsedMs < 600) score += 25;
    else if (elapsedMs < 1200) score += 15;
    if (hasSsl) score += 20;
    if (hasSchema) score += 15;
    if (hasPixel) score += 10;
    if (hasGtm || hasGa4) score += 5;

    const findings = [];
    if (elapsedMs > 800) {
      findings.append({
        id: "latency_high",
        severity: "warning",
        title: `Server Response Latency: ${elapsedMs}ms`,
        fix: "Optimize server TTFB, database query caches, and edge CDN compression."
      });
    } else {
      findings.push({
        id: "latency_fast",
        severity: "good",
        title: `Fast Response Latency: ${elapsedMs}ms`,
        fix: "Server initial response within healthy thresholds."
      });
    }

    if (!hasPixel) {
      findings.push({
        id: "pixel_missing",
        severity: "critical",
        title: "Meta Conversion Tracking Pixel Missing",
        fix: "Deploy Meta conversion tracking to attribute ad spend."
      });
    }

    if (!hasSchema) {
      findings.push({
        id: "schema_missing",
        severity: "warning",
        title: "Structured Schema.org Entity Missing",
        fix: "Deploy JSON-LD entity data for Google Knowledge Panel visibility."
      });
    }

    return new Response(JSON.stringify({
      success: true,
      url: fetchResp.url,
      measured_latency_ms: elapsedMs,
      score: Math.min(100, score),
      has_ssl: hasSsl,
      has_schema: hasSchema,
      has_pixel: hasPixel,
      has_analytics: hasGtm || hasGa4,
      has_viewport: hasViewport,
      findings
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: "unreachable",
      message: "Target server could not be reached or timed out."
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}
