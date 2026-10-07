/**
 * SAPVIK Growth Estimator & Budget Modeler
 * Illustrative simulator loaded from /config/assumptions.json.
 * Zero unverified claims, no double-toggle bugs, clean accessible inputs.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const budgetSlider = document.getElementById('calcBudgetSlider');
  const budgetValNum = document.getElementById('calcBudgetValue');
  const industrySelect = document.getElementById('calcIndustrySelect');
  const checkboxes = document.querySelectorAll('.calc-checkbox');
  const claimBlueprintBtn = document.getElementById('claimBlueprintBtn');

  // Outputs
  const outImpressions = document.getElementById('calcOutImpressions');
  const outInquiries = document.getElementById('calcOutInquiries');
  const outLocalLift = document.getElementById('calcOutLocalLift');
  const outEfficiency = document.getElementById('calcOutEfficiency');
  const dispatchText = document.getElementById('blueprintDispatchText');

  // Fallback assumptions in case network fetch fails
  let assumptionsData = {
    calculator_type: "illustrative_simulator",
    industries: {
      other: { name: "General Local Commercial", cpl_base: 600, cpm_base: 180, source: "placeholder_benchmark" },
      healthcare: { name: "Clinics & Healthcare", cpl_base: 550, cpm_base: 180, source: "placeholder_benchmark" },
      d2c: { name: "E-Commerce / D2C", cpl_base: 320, cpm_base: 140, source: "placeholder_benchmark" },
      b2b: { name: "B2B & Professional Services", cpl_base: 1100, cpm_base: 240, source: "placeholder_benchmark" },
      education: { name: "Education & Coaching", cpl_base: 480, cpm_base: 160, source: "placeholder_benchmark" }
    }
  };

  // Attempt to load assumptions from deployed static config
  try {
    const res = await fetch('/config/assumptions.json');
    if (res.ok) {
      const json = await res.json();
      if (json && json.industries) {
        assumptionsData = json;
      }
    }
  } catch (err) {
    // Retain fallback defaults
  }

  function formatIndianCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  function formatCount(num) {
    if (typeof num !== 'number') return num;
    if (num >= 100000) {
      return (num / 100000).toFixed(1) + ' Lakh';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return Math.round(num).toString();
  }

  function calculateOutputs() {
    const budget = budgetSlider ? parseInt(budgetSlider.value, 10) : 50000;
    const selectedIndustryKey = industrySelect ? industrySelect.value : 'other';
    const industryModel = (assumptionsData.industries && assumptionsData.industries[selectedIndustryKey])
      ? assumptionsData.industries[selectedIndustryKey]
      : assumptionsData.industries.other;

    // Read active services from checkbox states
    const activeServices = [];
    checkboxes.forEach(cb => {
      const chip = cb.closest('.calc-chip');
      if (cb.checked) {
        activeServices.push(cb.value);
        if (chip) chip.classList.add('active');
      } else {
        if (chip) chip.classList.remove('active');
      }
    });

    if (budgetValNum) {
      budgetValNum.textContent = formatIndianCurrency(budget);
    }

    // Empty state: No service selected
    if (activeServices.length === 0) {
      if (outImpressions) outImpressions.textContent = '—';
      if (outInquiries) outInquiries.textContent = '—';
      if (outLocalLift) outLocalLift.textContent = '—';
      if (outEfficiency) outEfficiency.textContent = '—';
      if (dispatchText) {
        dispatchText.textContent = 'Select one or more services above to model projected monthly reach and inquiries based on your stated ad budget.';
      }
      return;
    }

    const hasPromotions = activeServices.includes('promotions');
    const hasWebsites = activeServices.includes('websites');
    const hasGMB = activeServices.includes('gmb');

    // Model Calculations
    let impressionsDisplay = '—';
    let inquiriesDisplay = '—';
    let efficiencyDisplay = 'Organic Scope';

    if (hasPromotions) {
      // Direct acquisition model based on industry median CPL/CPM
      const cpl = industryModel.cpl_base || 600;
      const cpm = industryModel.cpm_base || 180;

      // Realistic budget scaling curve
      const spendScale = Math.pow(budget / 50000, 0.90);
      const baseInquiries = (50000 / cpl) * spendScale;

      const minInq = Math.max(5, Math.round(baseInquiries * 0.85));
      const maxInq = Math.max(minInq + 2, Math.round(baseInquiries * 1.15));
      const totalImpressions = Math.round((budget / cpm) * 1000);

      impressionsDisplay = `${formatCount(totalImpressions)}+`;
      inquiriesDisplay = `${minInq} – ${maxInq}`;
      efficiencyDisplay = hasWebsites ? 'Optimized Funnel' : 'Standard Ad Traffic';
    } else {
      impressionsDisplay = '— (Organic)';
      inquiriesDisplay = hasWebsites ? 'Organic Baseline' : 'Direct Referrals';
      efficiencyDisplay = 'Organic Setup';
    }

    // Local 3-Pack Indicator
    let localLiftStr = 'Not Selected';
    if (hasGMB) {
      localLiftStr = hasPromotions ? 'Multi-Channel Push' : 'Local 3-Pack Target';
    }

    // Update DOM
    if (outImpressions) outImpressions.textContent = impressionsDisplay;
    if (outInquiries) outInquiries.textContent = inquiriesDisplay;
    if (outLocalLift) outLocalLift.textContent = localLiftStr;
    if (outEfficiency) outEfficiency.textContent = efficiencyDisplay;

    // Update Blueprint Dispatch Note
    if (dispatchText) {
      const labels = {
        websites: 'Websites Development',
        gmb: 'GMB Management',
        media: 'Media Management',
        promotions: 'Digital Promotions (Ads)',
        apps: 'Application Development',
        branding: 'Branding'
      };
      const selectedNames = activeServices.map(s => labels[s] || s).join(', ');

      dispatchText.innerHTML = '';
      
      const scopeP = document.createElement('div');
      scopeP.style.marginBottom = '0.35rem';
      scopeP.innerHTML = `<strong>Configured Scope:</strong> ${selectedNames}`;

      const budgetP = document.createElement('div');
      budgetP.style.marginBottom = '0.35rem';
      budgetP.innerHTML = hasPromotions 
        ? `<strong>Allocated Monthly Ad Budget:</strong> ${formatIndianCurrency(budget)} (${industryModel.name})`
        : `<strong>Execution Model:</strong> Non-ad organic baseline (Media budget slider applies when Digital Promotions is active)`;

      const noteP = document.createElement('div');
      noteP.style.fontSize = '0.8rem';
      noteP.style.color = 'var(--c-text-muted)';
      noteP.style.fontStyle = 'italic';
      noteP.textContent = 'Illustrative simulator based on benchmark placeholders in assumptions.json. Actual returns depend on market category, unit economics, conversion efficiency, and operational close rate.';

      dispatchText.appendChild(scopeP);
      dispatchText.appendChild(budgetP);
      dispatchText.appendChild(noteP);
    }
  }

  // Bind change listeners to checkboxes (fixes the label click double-toggle bug)
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      calculateOutputs();
      if (window.track) {
        window.track('calc_interact', { budget: budgetSlider ? budgetSlider.value : 0 });
      }
    });
  });

  if (budgetSlider) {
    budgetSlider.addEventListener('input', calculateOutputs);
  }

  if (industrySelect) {
    industrySelect.addEventListener('change', calculateOutputs);
  }

  // Claim Blueprint Button Hand-off
  if (claimBlueprintBtn) {
    claimBlueprintBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      const activeServices = [];
      checkboxes.forEach(cb => {
        if (cb.checked) activeServices.push(cb.value);
      });

      const budget = budgetSlider ? parseInt(budgetSlider.value, 10) : 50000;
      const industryName = industrySelect ? industrySelect.options[industrySelect.selectedIndex].text : 'General';

      const formService = document.getElementById('formService');
      if (formService) {
        formService.value = activeServices.length === 1 ? activeServices[0] : 'all';
      }

      const formDetails = document.getElementById('formDetails');
      if (formDetails) {
        formDetails.value = `[Claimed Blueprint Configuration]\nCategory: ${industryName}\nServices: ${activeServices.join(', ')}\nTarget Ad Budget: ${formatIndianCurrency(budget)} / mo\nPlease reach out with technical proposal and deliverables.`;
      }

      if (window.track) {
        window.track('calc_claim', { services: activeServices.join(','), budget });
      }

      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
        const nameField = document.getElementById('formName');
        if (nameField) setTimeout(() => nameField.focus(), 600);
      }
    });
  }

  // Initial Calculation Run
  calculateOutputs();
});
