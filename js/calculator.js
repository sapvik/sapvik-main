/**
 * SAPVIK Growth Calculator & ROI Simulator
 * Precision Digital Growth Instrument
 */

document.addEventListener('DOMContentLoaded', () => {
  const serviceCheckboxes = document.querySelectorAll('.calc-checkbox, .chip-checkbox');
  const budgetSlider = document.getElementById('budgetSlider');
  const budgetDisplay = document.getElementById('budgetDisplay');
  const currencyToggle = document.getElementById('currencyToggle');

  // Outputs
  const outReach = document.getElementById('calcOutReach');
  const outLeads = document.getElementById('calcOutLeads');
  const outGmb = document.getElementById('calcOutGmb');
  const outRoi = document.getElementById('calcOutRoi');
  const blueprintText = document.getElementById('blueprintText');
  const claimBtn = document.getElementById('claimBlueprintBtn');

  if (!budgetSlider) return;

  let currentCurrency = 'INR'; // 'INR' or 'USD'

  // Service Multipliers
  const serviceWeights = {
    website: { reach: 1.25, leads: 1.45, gmb: 1.15, name: 'Websites Development' },
    gmb: { reach: 1.40, leads: 1.55, gmb: 2.20, name: 'GMB Management' },
    media: { reach: 1.85, leads: 1.25, gmb: 1.10, name: 'Media Management' },
    promotions: { reach: 2.50, leads: 2.30, gmb: 1.35, name: 'Digital Promotions' },
    apps: { reach: 1.15, leads: 1.50, gmb: 1.00, name: 'Application Development' },
    branding: { reach: 1.30, leads: 1.30, gmb: 1.20, name: 'Branding' }
  };

  function formatNumber(num) {
    if (num >= 100000) {
      return (num / 100000).toFixed(1) + ' Lakh';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return Math.round(num).toString();
  }

  function formatCurrency(val) {
    if (currentCurrency === 'INR') {
      return '₹' + parseInt(val, 10).toLocaleString('en-IN');
    } else {
      const usdVal = Math.round(val / 83);
      return '$' + usdVal.toLocaleString('en-US');
    }
  }

  function recalculate() {
    const rawBudget = parseInt(budgetSlider.value, 10);
    if (budgetDisplay) {
      budgetDisplay.textContent = formatCurrency(rawBudget) + ' / mo';
    }

    // Identify selected services
    const selected = [];
    let reachMultiplier = 1;
    let leadsMultiplier = 1;
    let gmbMultiplier = 1;

    serviceCheckboxes.forEach(cb => {
      const parentChip = cb.closest('.calc-chip, .service-chip-label');
      if (cb.checked) {
        if (parentChip) parentChip.classList.add('active');
        const key = cb.value;
        if (serviceWeights[key]) {
          selected.push(serviceWeights[key].name);
          reachMultiplier *= (serviceWeights[key].reach * 0.85);
          leadsMultiplier *= (serviceWeights[key].leads * 0.85);
          gmbMultiplier *= (serviceWeights[key].gmb * 0.85);
        }
      } else {
        if (parentChip) parentChip.classList.remove('active');
      }
    });

    const budgetFactor = rawBudget / 35000;
    const count = Math.max(selected.length, 1);

    const calculatedReach = Math.round(18000 * budgetFactor * (reachMultiplier / count) * (count * 0.72));
    const calculatedLeads = Math.round(35 * budgetFactor * (leadsMultiplier / count) * (count * 0.68));
    const calculatedGmb = Math.min(Math.round(85 * gmbMultiplier), 380);
    const calculatedRoi = (2.8 + (count * 0.35) + (budgetFactor * 0.22)).toFixed(1);

    // Update Telemetry Display
    if (outReach) outReach.textContent = formatNumber(calculatedReach) + '+';
    if (outLeads) outLeads.textContent = calculatedLeads + ' - ' + Math.round(calculatedLeads * 1.35);
    if (outGmb) outGmb.textContent = '+' + calculatedGmb + '%';
    if (outRoi) outRoi.textContent = calculatedRoi + 'x';

    // Blueprint Formulation
    let blueprintTitle = 'Custom Growth Blueprint';
    if (selected.includes('GMB Management') && selected.includes('Websites Development')) {
      blueprintTitle = 'Local Domination & Search Lead Engine';
    } else if (selected.includes('Digital Promotions') && selected.includes('Media Management')) {
      blueprintTitle = 'Full-Funnel Acquisition & Scale Blueprint';
    } else if (selected.length >= 4) {
      blueprintTitle = 'Enterprise Digital Acceleration Suite';
    }

    if (blueprintText) {
      blueprintText.innerHTML = `<strong>RECOMMENDED BLUEPRINT:</strong> <em>${blueprintTitle}</em> configured for <strong>${selected.join(', ') || 'Selected Services'}</strong> at ${formatCurrency(rawBudget)}/month. Target delivery: <strong>${calculatedLeads}+ monthly verified buyer leads</strong>.`;
    }

    window.lastCalculatedBlueprint = {
      services: selected,
      budget: formatCurrency(rawBudget),
      title: blueprintTitle,
      leads: calculatedLeads
    };
  }

  // Bind Listeners
  serviceCheckboxes.forEach(cb => {
    cb.addEventListener('change', recalculate);
  });

  budgetSlider.addEventListener('input', recalculate);

  if (currencyToggle) {
    currencyToggle.addEventListener('click', () => {
      currentCurrency = currentCurrency === 'INR' ? 'USD' : 'INR';
      currencyToggle.textContent = currentCurrency === 'INR' ? 'Show in USD ($)' : 'Show in INR (₹)';
      recalculate();
    });
  }

  // Pre-fill audit form on button click
  if (claimBtn) {
    claimBtn.addEventListener('click', () => {
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }

      if (window.lastCalculatedBlueprint) {
        const detailsField = document.getElementById('formDetails');
        const serviceSelect = document.getElementById('formServiceSelect');
        
        if (detailsField) {
          detailsField.value = `[Claimed Blueprint: ${window.lastCalculatedBlueprint.title}]\nTarget Budget: ${window.lastCalculatedBlueprint.budget}\nSelected Pillars: ${window.lastCalculatedBlueprint.services.join(', ')}\nExpected Lead Volume: ~${window.lastCalculatedBlueprint.leads} / month`;
        }

        if (serviceSelect && window.lastCalculatedBlueprint.services.length > 0) {
          serviceSelect.value = 'all';
        }
      }
    });
  }

  // Initial Calculation
  recalculate();
});
