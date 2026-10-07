import http.server
import socketserver
import urllib.parse
import urllib.request
import json
import time
import ssl
import socket
import ipaddress
import os
import re

PORT = 8081
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')

# In-memory IP rate limiter for audit scanner: {ip: [timestamps]}
RATE_LIMITS = {}
MAX_SCANS_PER_HOUR = 15

def is_ip_private_or_restricted(ip_str):
    try:
        ip = ipaddress.ip_address(ip_str)
        return (ip.is_private or ip.is_loopback or ip.is_link_local or 
                ip.is_multicast or ip.is_reserved or ip.is_unspecified)
    except ValueError:
        return True

def safe_validate_target_url(raw_url):
    """
    Validates URL scheme, port, and checks resolved DNS IPs against SSRF targets.
    Returns (cleaned_url, error_message)
    """
    if not raw_url:
        return None, "Empty URL provided"
    
    url = raw_url.strip()
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ('http', 'https'):
        return None, "Only HTTP and HTTPS protocols are permitted."
    
    hostname = parsed.hostname
    if not hostname:
        return None, "Invalid hostname."
    
    # Reject direct localhost names
    if hostname.lower() in ('localhost', '127.0.0.1', '::1', '0.0.0.0'):
        return None, "Access to localhost or loopback is blocked."

    port = parsed.port or (443 if parsed.scheme == 'https' else 80)
    if port not in (80, 443):
        return None, "Only standard web ports 80 and 443 are supported."

    # DNS Resolution & SSRF check
    try:
        addr_info = socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
        resolved_ips = [ai[4][0] for ai in addr_info]
    except socket.gaierror:
        return None, f"Could not resolve domain: {hostname}"

    for ip_str in resolved_ips:
        if is_ip_private_or_restricted(ip_str):
            return None, f"Domain resolves to private or restricted network address ({ip_str})."

    return url, None


class UnifiedHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/audit':
            self.handle_audit_api(parsed)
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/contact':
            self.handle_contact_api()
        elif parsed.path == '/api/audit':
            self.handle_audit_api(parsed)
        else:
            self.send_error(404, "Endpoint not found")

    def handle_audit_api(self, parsed):
        client_ip = self.client_address[0]
        now = time.time()
        
        # Rate Limiting
        history = [t for t in RATE_LIMITS.get(client_ip, []) if now - t < 3600]
        if len(history) >= MAX_SCANS_PER_HOUR:
            self.send_json_response(429, {
                "success": False,
                "error": "rate_limit_exceeded",
                "message": f"Scan limit reached ({MAX_SCANS_PER_HOUR}/hour). Please connect directly via WhatsApp for a full audit."
            })
            return
        
        params = urllib.parse.parse_qs(parsed.query)
        target = params.get('url', [''])[0].strip()
        
        clean_url, error = safe_validate_target_url(target)
        if error:
            self.send_json_response(400, {
                "success": False,
                "error": "invalid_target",
                "message": error
            })
            return

        # Record scan timestamp
        history.append(now)
        RATE_LIMITS[client_ip] = history

        # Execute Live Scan
        try:
            start_time = time.time()
            ctx = ssl.create_default_context()
            # Require valid SSL verification
            ctx.check_hostname = True
            ctx.verify_mode = ssl.CERT_REQUIRED
            
            req = urllib.request.Request(
                clean_url,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SAPVIK-Diagnostic-Probe/2.0'}
            )
            
            with urllib.request.urlopen(req, timeout=8, context=ctx) as resp:
                elapsed_ms = round((time.time() - start_time) * 1000)
                html_snippet = resp.read(1500000).decode('utf-8', errors='ignore')
                final_url = resp.geturl()
                content_type = resp.headers.get('Content-Type', '')

                # Analyze real findings
                has_ssl = final_url.startswith('https://')
                has_hsts = 'strict-transport-security' in resp.headers
                html_lower = html_snippet.lower()
                
                # Check Schema markup
                has_schema = 'schema.org' in html_lower or 'application/ld+json' in html_lower
                has_local_schema = 'localbusiness' in html_lower or 'medicalorganization' in html_lower or 'store' in html_lower
                
                # Check Tracking pixels
                has_gtm = 'googletagmanager.com' in html_lower or 'gtm-' in html_lower
                has_ga4 = 'gtag(' in html_lower or 'google-analytics.com' in html_lower or 'g-' in html_lower
                has_meta_pixel = 'fbevents.js' in html_lower or 'connect.facebook.net' in html_lower
                has_clarity = 'clarity.ms' in html_lower
                
                # Check Mobile/Meta Essentials
                has_viewport = '<meta name="viewport"' in html_lower or "<meta name='viewport'" in html_lower
                has_canonical = '<link rel="canonical"' in html_lower or "<link rel='canonical'" in html_lower
                has_og = 'og:title' in html_lower or 'property="og:' in html_lower

                # Compute weighted score based strictly on real findings
                # Latency (0-30 pts)
                latency_score = 30 if elapsed_ms < 400 else (20 if elapsed_ms < 800 else (10 if elapsed_ms < 1500 else 0))
                # Security (0-25 pts)
                security_score = (15 if has_ssl else 0) + (10 if has_hsts else 0)
                # SEO & Schema (0-25 pts)
                seo_score = (10 if has_canonical else 0) + (10 if has_schema else 0) + (5 if has_viewport else 0)
                # Analytics & Attribution (0-20 pts)
                analytics_score = (8 if (has_gtm or has_ga4) else 0) + (8 if has_meta_pixel else 0) + (4 if has_clarity else 0)
                
                computed_score = min(100, max(15, latency_score + security_score + seo_score + analytics_score))
                
                findings = []
                if elapsed_ms > 800:
                    findings.append({
                        "id": "latency_high",
                        "severity": "warning",
                        "title": f"Server Response Latency: {elapsed_ms}ms",
                        "fix": "Optimize server TTFB, database query caches, and edge CDN compression."
                    })
                else:
                    findings.append({
                        "id": "latency_fast",
                        "severity": "good",
                        "title": f"Fast Edge Latency: {elapsed_ms}ms",
                        "fix": "Server responds within recommended thresholds."
                    })

                if not has_meta_pixel:
                    findings.append({
                        "id": "pixel_missing",
                        "severity": "critical",
                        "title": "Meta Conversion Tracking Pixel Missing",
                        "fix": "Deploy Meta CAPI / Pixel to avoid untracked social acquisition ad spend."
                    })
                
                if not has_schema:
                    findings.append({
                        "id": "schema_missing",
                        "severity": "warning",
                        "title": "Structured Schema.org Entity Missing",
                        "fix": "Add JSON-LD entity data for Google Knowledge Panel and Local 3-Pack visibility."
                    })
                elif not has_local_schema:
                    findings.append({
                        "id": "local_schema_missing",
                        "severity": "info",
                        "title": "LocalBusiness Schema Recommended",
                        "fix": "Specify geo-coordinates, operating hours, and review schema."
                    })

                if not (has_gtm or has_ga4):
                    findings.append({
                        "id": "analytics_missing",
                        "severity": "warning",
                        "title": "No Verified Google Analytics 4 / GTM Container",
                        "fix": "Install unified GTM container for cross-channel conversion attribution."
                    })

                self.send_json_response(200, {
                    "success": True,
                    "url": final_url,
                    "measured_latency_ms": elapsed_ms,
                    "score": computed_score,
                    "has_ssl": has_ssl,
                    "has_hsts": has_hsts,
                    "has_schema": has_schema,
                    "has_pixel": has_meta_pixel,
                    "has_analytics": bool(has_gtm or has_ga4),
                    "has_viewport": has_viewport,
                    "findings": findings[:4],
                    "measured_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                })

        except ssl.SSLCertVerificationError:
            self.send_json_response(200, {
                "success": False,
                "error": "ssl_invalid",
                "message": "SSL Certificate verification failed. Target site has an expired or untrusted certificate."
            })
        except urllib.error.HTTPError as e:
            self.send_json_response(200, {
                "success": False,
                "error": f"http_error_{e.code}",
                "message": f"Target server returned HTTP {e.code} ({e.reason})."
            })
        except urllib.error.URLError as e:
            self.send_json_response(200, {
                "success": False,
                "error": "unreachable",
                "message": f"Could not reach target domain ({str(e.reason)})."
            })
        except Exception as e:
            self.send_json_response(200, {
                "success": False,
                "error": "scan_timeout",
                "message": "Request timed out after 8 seconds without response."
            })

    def handle_contact_api(self):
        content_len = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_len).decode('utf-8', errors='ignore')
        try:
            data = json.loads(post_body)
        except json.JSONDecodeError:
            self.send_json_response(400, {"ok": False, "message": "Invalid JSON format."})
            return

        # Honeypot check
        if data.get('website_url_hp'):
            # Silently drop bot submission
            self.send_json_response(200, {"ok": True, "lead_id": "SUB-BOT-DISCARD"})
            return

        name = data.get('name', '').strip()
        phone = data.get('phone', '').strip()
        email = data.get('email', '').strip()
        business = data.get('business', '').strip()
        website = data.get('website', '').strip()
        service = data.get('service', 'all')
        notes = data.get('details', '').strip()

        # Validation
        if not name or len(name) < 2:
            self.send_json_response(400, {"ok": False, "message": "Please provide your full name."})
            return
        if not phone or len(phone) < 8:
            self.send_json_response(400, {"ok": False, "message": "Please provide a valid direct phone or WhatsApp number."})
            return
        if not email or '@' not in email or '.' not in email:
            self.send_json_response(400, {"ok": False, "message": "Please provide a valid business email address."})
            return

        # Lead ID generation
        lead_id = f"SAPVIK-{int(time.time())}"
        
        # Save lead to local audit lead ledger
        lead_entry = {
            "lead_id": lead_id,
            "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            "name": name,
            "phone": phone,
            "email": email,
            "business": business,
            "website": website,
            "service": service,
            "notes": notes,
            "utm": data.get('utm', {}),
            "audit_data": data.get('audit', {})
        }
        
        leads_file = os.path.join(os.path.dirname(__file__), 'leads.jsonl')
        try:
            with open(leads_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(lead_entry) + '\n')
            print(f"[LEAD CAPTURED] {lead_id} | {name} ({business}) | {phone} | {email}")
        except Exception as e:
            print(f"[LEAD LOG ERROR] {e}")

        # Send response
        self.send_json_response(200, {
            "ok": True,
            "lead_id": lead_id,
            "message": "Audit and growth consultation request logged successfully."
        })

    def send_json_response(self, code, data):
        body = json.dumps(data).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(('', PORT), UnifiedHandler) as httpd:
        print(f"SAPVIK Production-Grade Server running at http://localhost:{PORT}")
        print(f"Serving static assets from: {PUBLIC_DIR}")
        print(f"Active APIs: /api/audit (with SSRF protection), /api/contact")
        httpd.serve_forever()

if __name__ == '__main__':
    run_server()
