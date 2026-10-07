/**
 * SAPVIK Forensic Growth Engine & Interactive Hooks
 * Pure Verified Logic, Real Backend Diagnostics, Accessible Components
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // 1. REAL LIVE FORENSIC WEBSITE AUDIT SCANNER
  // ==========================================================================
  const scanInput = document.getElementById('scannerUrlInput');
  const runScanBtn = document.getElementById('runScanBtn');
  const scanProgressTrack = document.getElementById('scannerProgressTrack');
  const scanProgressBar = document.getElementById('scannerProgressBar');
  const scanStatusMsg = document.getElementById('scannerStatusMsg');
  const scanScoreVal = document.getElementById('scanScoreVal');
  const scanTtfbVal = document.getElementById('scanTtfbVal');
  const scanFindingsContainer = document.getElementById('scannerFindingsContainer');

  if (runScanBtn && scanInput) {
    runScanBtn.addEventListener('click', async () => {
      const rawTarget = scanInput.value.trim();
      if (!rawTarget) {
        scanInput.focus();
        return;
      }

      // UI Scanning State
      runScanBtn.disabled = true;
      runScanBtn.textContent = 'ANALYZING...';
      if (scanProgressTrack) scanProgressTrack.style.display = 'block';
      if (scanProgressBar) scanProgressBar.style.width = '25%';
      if (scanStatusMsg) scanStatusMsg.textContent = 'Dispatching real network probe & SSL handshake...';

      window.track('scan_start', { target: rawTarget.replace(/https?:\/\//, '').split('/')[0] });

      try {
        if (scanProgressBar) scanProgressBar.style.width = '55%';
        if (scanStatusMsg) scanStatusMsg.textContent = 'Inspecting HTML headers, Schema entity, & tracking pixels...';

        const auditUrl = `/api/audit?url=${encodeURIComponent(rawTarget)}`;
        const resp = await fetch(auditUrl);
        const data = await resp.json();

        if (scanProgressBar) scanProgressBar.style.width = '100%';

        if (resp.ok && data.success) {
          // Success with Real Measured Findings
          if (scanStatusMsg) {
            scanStatusMsg.textContent = `Live Probe Complete for ${data.url}`;
          }
          if (scanScoreVal) {
            scanScoreVal.textContent = `${data.score}/100`;
            scanScoreVal.style.color = data.score >= 80 ? 'var(--c-success)' : (data.score >= 50 ? 'var(--c-warning)' : 'var(--c-vermilion)');
          }
          if (scanTtfbVal) {
            scanTtfbVal.textContent = `${data.measured_latency_ms}ms`;
          }

          // Populate findings list safely
          if (scanFindingsContainer) {
            scanFindingsContainer.innerHTML = '';
            (data.findings || []).forEach(f => {
              const li = document.createElement('li');
              li.className = `scanner-finding-item ${f.severity || 'warning'}`;
              
              const titleEl = document.createElement('div');
              titleEl.style.fontWeight = '700';
              titleEl.textContent = f.title;

              const fixEl = document.createElement('div');
              fixEl.style.fontSize = '0.78rem';
              fixEl.style.color = 'var(--c-text-muted)';
              fixEl.style.marginTop = '2px';
              fixEl.textContent = f.fix;

              const textWrap = document.createElement('div');
              textWrap.appendChild(titleEl);
              textWrap.appendChild(fixEl);

              li.appendChild(textWrap);
              scanFindingsContainer.appendChild(li);
            });
          }

          // Store audit in session for contact form attachment
          sessionStorage.setItem('sapvik_latest_audit', JSON.stringify({
            url: data.url,
            score: data.score,
            latency_ms: data.measured_latency_ms,
            findings: data.findings
          }));

          // Pre-fill form website field without overwriting user notes
          const formWebsite = document.getElementById('formWebsite');
          if (formWebsite && !formWebsite.value) {
            formWebsite.value = data.url;
          }

          window.track('scan_complete', { score: data.score });

        } else {
          // Honest failure state - NO fabricated numbers!
          const errorMsg = data.message || 'Scan could not be completed for this domain.';
          if (scanStatusMsg) {
            scanStatusMsg.textContent = `Probe halted: ${errorMsg}`;
          }
          if (scanScoreVal) {
            scanScoreVal.textContent = 'N/A';
            scanScoreVal.style.color = 'var(--c-text-muted)';
          }
          if (scanTtfbVal) {
            scanTtfbVal.textContent = 'Timeout';
          }
          if (scanFindingsContainer) {
            scanFindingsContainer.innerHTML = '';
            const li = document.createElement('li');
            li.className = 'scanner-finding-item critical';
            li.innerHTML = `<div><strong>${errorMsg}</strong><div style="font-size: 0.78rem; color: var(--c-text-muted); margin-top: 2px;">Target may block external crawlers or has strict firewall policies. Request a manual audit below.</div></div>`;
            scanFindingsContainer.appendChild(li);
          }
          window.track('scan_error', { error: data.error || 'failed' });
        }

      } catch (err) {
        if (scanStatusMsg) scanStatusMsg.textContent = 'Network error connecting to diagnostic service.';
        if (scanScoreVal) scanScoreVal.textContent = 'N/A';
        window.track('scan_error', { error: 'network_exception' });
      } finally {
        runScanBtn.disabled = false;
        runScanBtn.textContent = 'RE-SCAN';
        setTimeout(() => {
          if (scanProgressTrack) scanProgressTrack.style.display = 'none';
        }, 1200);
      }
    });
  }

  // ==========================================================================
  // 2. INTERACTIVE GMB 3-PACK GEO-GRID HEATMAP (HONEST DEMONSTRATION)
  // ==========================================================================
  const heatmapNodes = document.querySelectorAll('.geo-grid-node');
  const btnUnoptimized = document.getElementById('btnModeUnoptimized');
  const btnOptimized = document.getElementById('btnModeOptimized');
  const heatmapCallsVal = document.getElementById('heatmapCallsVal');
  const heatmapRankVal = document.getElementById('heatmapRankVal');
  const heatmapNotice = document.getElementById('heatmapNotice');

  const unoptimizedData = [
    { rank: 14, class: 'rank-poor', area: 'Central' },
    { rank: 9,  class: 'rank-poor', area: 'North' },
    { rank: 18, class: 'rank-poor', area: 'East' },
    { rank: 12, class: 'rank-poor', area: 'South-E' },
    { rank: 8,  class: 'rank-poor', area: 'Downtown' },
    { rank: 16, class: 'rank-poor', area: 'Ring Rd' },
    { rank: 22, class: 'rank-poor', area: 'North-W' },
    { rank: 11, class: 'rank-poor', area: 'East-Ext' },
    { rank: 15, class: 'rank-poor', area: 'Uptown' },
    { rank: 7,  class: 'rank-poor', area: 'Hub' },
    { rank: 19, class: 'rank-poor', area: 'South-W' },
    { rank: 13, class: 'rank-poor', area: 'East-S' },
    { rank: 21, class: 'rank-poor', area: 'West-Ext' },
    { rank: 10, class: 'rank-poor', area: 'Airport' },
    { rank: 17, class: 'rank-poor', area: 'Jct' },
    { rank: 14, class: 'rank-poor', area: 'Sector 5' }
  ];

  // Exactly 16 out of 16 in Top 3
  const optimizedData = [
    { rank: 1, class: 'rank-top', area: 'Central' },
    { rank: 2, class: 'rank-top', area: 'North' },
    { rank: 1, class: 'rank-top', area: 'East' },
    { rank: 1, class: 'rank-top', area: 'South-E' },
    { rank: 1, class: 'rank-top', area: 'Downtown' },
    { rank: 2, class: 'rank-top', area: 'Ring Rd' },
    { rank: 1, class: 'rank-top', area: 'North-W' },
    { rank: 2, class: 'rank-top', area: 'East-Ext' },
    { rank: 1, class: 'rank-top', area: 'Uptown' },
    { rank: 1, class: 'rank-top', area: 'Hub' },
    { rank: 2, class: 'rank-top', area: 'South-W' },
    { rank: 1, class: 'rank-top', area: 'East-S' },
    { rank: 2, class: 'rank-top', area: 'West-Ext' },
    { rank: 1, class: 'rank-top', area: 'Airport' },
    { rank: 3, class: 'rank-top', area: 'Jct' },
    { rank: 1, class: 'rank-top', area: 'Sector 5' }
  ];

  function applyHeatmapState(isOptimized) {
    const data = isOptimized ? optimizedData : unoptimizedData;
    heatmapNodes.forEach((node, idx) => {
      if (data[idx]) {
        node.style.transform = 'scale(0.85)';
        setTimeout(() => {
          node.className = `geo-grid-node ${data[idx].class}`;
          const rankEl = node.querySelector('.rank-num');
          const radiusEl = node.querySelector('.radius-lbl');
          if (rankEl) rankEl.textContent = `#${data[idx].rank}`;
          if (radiusEl) radiusEl.textContent = data[idx].area;
          node.style.transform = 'scale(1)';
        }, 100);
      }
    });

    if (isOptimized) {
      if (heatmapCallsVal) heatmapCallsVal.textContent = '148 / mo';
      if (heatmapRankVal) heatmapRankVal.textContent = '100%';
      if (heatmapNotice) {
        heatmapNotice.innerHTML = `<strong>SAPVIK SPRINT STATE:</strong> Demonstrating 16 out of 16 local pin radii in Top 3. High local search authority drives steady inbound inquiry flow.`;
      }
      if (btnOptimized) btnOptimized.classList.add('active');
      if (btnUnoptimized) btnUnoptimized.classList.remove('active');
      window.track('heatmap_toggle', { mode: 'optimized' });
    } else {
      if (heatmapCallsVal) heatmapCallsVal.textContent = '32 / mo';
      if (heatmapRankVal) heatmapRankVal.textContent = '0%';
      if (heatmapNotice) {
        heatmapNotice.innerHTML = `<strong>UNOPTIMIZED BASELINE:</strong> Business ranks outside Local 3-Pack across surrounding sectors. Inquiries leak to top-3 competitors.`;
      }
      if (btnUnoptimized) btnUnoptimized.classList.add('active');
      if (btnOptimized) btnOptimized.classList.remove('active');
      window.track('heatmap_toggle', { mode: 'unoptimized' });
    }
  }

  if (btnUnoptimized && btnOptimized) {
    btnUnoptimized.addEventListener('click', () => applyHeatmapState(false));
    btnOptimized.addEventListener('click', () => applyHeatmapState(true));
    applyHeatmapState(true);
  }

  // Make nodes focusable & accessible
  heatmapNodes.forEach((node) => {
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', '0');
    
    const inspectNode = () => {
      const rankNum = node.querySelector('.rank-num')?.textContent || '#1';
      const area = node.querySelector('.radius-lbl')?.textContent || 'Sector';
      if (heatmapNotice) {
        heatmapNotice.innerHTML = `<strong>Pin Inspection [${area}]:</strong> Business currently holds rank <strong>${rankNum}</strong> in this geographic radius.`;
      }
    };

    node.addEventListener('click', inspectNode);
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        inspectNode();
      }
    });
  });

  // ==========================================================================
  // 3. BESPOKE MOBILE TOUCH-SNAP SERVICE DECK
  // ==========================================================================
  const serviceGrid = document.querySelector('.services-framed-grid');
  const serviceCards = document.querySelectorAll('.service-panel');
  const paginationWrapper = document.getElementById('servicesPagination');

  if (serviceGrid && serviceCards.length > 0 && paginationWrapper) {
    paginationWrapper.innerHTML = '';
    const dots = [];

    serviceCards.forEach((_, idx) => {
      const dot = document.createElement('span');
      dot.className = `snap-dot ${idx === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Service ${idx + 1}`);
      dots.push(dot);
      paginationWrapper.appendChild(dot);
    });

    let scrollTimeout;
    serviceGrid.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollLeft = serviceGrid.scrollLeft;
        // Accurate card width + gap (16px / 1rem) calculation
        const cardWidth = serviceCards[0].offsetWidth + 16;
        const activeIdx = Math.min(serviceCards.length - 1, Math.max(0, Math.round(scrollLeft / cardWidth)));
        
        dots.forEach((dot, idx) => {
          dot.classList.toggle('active', idx === activeIdx);
        });
      }, 50);
    }, { passive: true });
  }

  // ==========================================================================
  // 4. MOBILE BOTTOM DOCK INTERSECTION OBSERVER
  // ==========================================================================
  const mobileDock = document.getElementById('mobileBottomDock');
  const contactSection = document.getElementById('contact');

  if (mobileDock && contactSection && 'IntersectionObserver' in window) {
    const dockObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          mobileDock.classList.add('dock-hidden');
        } else {
          mobileDock.classList.remove('dock-hidden');
        }
      });
    }, { threshold: 0.15 });

    dockObserver.observe(contactSection);
  }
});
