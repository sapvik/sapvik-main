/**
 * SAPVIK Growth Estimator & Budget Modeler
 * Spec-compliant, transparent assumptions, no arbitrary stacking
 */

document.addEventListener('DOMContentLoaded', () => {
  const budgetSlider = document.getElementById('calcBudgetSlider');
  const budgetValNum = document.getElementById('calcBudgetValue');
  const serviceChips = document.querySelectorAll('.calc-chip');
  const claimBlueprintBtn = document.getElementById('claimBlueprintBtn');

  // Outputs
  const outImpressions = document.getElementById('calcOutImpressions');
  const outInquiries = document.getElementById('calcOutInquiries');
  const outLocalLift = document.getElementById('calcOutLocalLift');
  const outEfficiency = document.getElementById('calcOutEfficiency');
  const dispatchText = document.getElementById('blueprintDispatchText');

  // Industry Benchmarks from config/assumptions.json
  const INDUSTRY_MODELS = {
    cpl_base: 520,   // Indian commercial median CPL for targeted Google/Meta lead gen
    cpm_base: 180,   // Indian commercial median CPM
  };

  function formatIndianCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  function formatCount(num) {
    if (num >= 100000) {
      return (num / 100000).toFixed(1) + ' Lakh';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return Math.round(num).toString();
  }

  function calculateOutputs() {
    const budget = budgetSlider ? parseInt(budgetSlider.value, 10) : 50000;
    
    // Read active services
    const activeServices = [];
    serviceChips.forEach(chip => {
      const checkbox = chip.querySelector('input[type="checkbox"]');
      if (checkbox && checkbox.checked) {
        activeServices.push(checkbox.value);
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
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

    // 1. Paid Promotions Model (Direct acquisition)
    let estImpressions = 0;
    let minInquiries = 0;
    let maxInquiries = 0;

    if (hasPromotions) {
      // Scale with mild diminishing returns as spend increases
      const spendScale = Math.pow(budget / 50000, 0.88);
      const baseLeads = (50000 / INDUSTRY_MODELS.cpl_base) * spendScale;
      
      // If conversion-optimized website is also deployed, conversion rate improves by ~20-30%
      const webMultiplier = hasWebsites ? 1.25 : 1.0;
      
      minInquiries = Math.round(baseLeads * 0.85 * webMultiplier);
      maxInquiries = Math.round(baseLeads * 1.15 * webMultiplier);
      estImpressions = Math.round((budget / INDUSTRY_MODELS.cpm_base) * 1000);
    } else if (hasWebsites) {
      // Website without paid ads relies on existing organic traffic
      minInquiries = 15;
      maxInquiries = 30;
      estImpressions = 5000;
    } else {
      minInquiries = 10;
      maxInquiries = 25;
      estImpressions = 2500;
    }

    // 2. GMB Local Search Lift Model
    let localLiftStr = 'N/A';
    if (hasGMB) {
      localLiftStr = hasPromotions ? '+180% – +260%' : '+120% – +180%';
    } else {
      localLiftStr = 'Not Selected';
    }

    // 3. Update DOM
    if (outImpressions) outImpressions.textContent = estImpressions > 0 ? `${formatCount(estImpressions)}+` : '—';
    if (outInquiries) outInquiries.textContent = minInquiries > 0 ? `${minInquiries} – ${maxInquiries}` : '—';
    if (outLocalLift) outLocalLift.textContent = localLiftStr;
    if (outEfficiency) {
      outEfficiency.textContent = hasPromotions ? (hasWebsites ? 'Optimized' : 'Standard') : 'Organic Only';
    }

    // 4. Update Blueprint Summary Dispatch
    if (dispatchText) {
      const selectedNames = activeServices.map(s => {
        const labels = {
          websites: 'Websites Development',
          gmb: 'GMB Management',
          media: 'Media Management',
          promotions: 'Digital Promotions',
          apps: 'Application Development',
          branding: 'Branding'
        };
        return labels[s] || s;
      }).join(', ');

      dispatchText.innerHTML = `
        <strong>Configured Scope:</strong> ${selectedNames}<br>
        <strong>Allocated Monthly Ad Budget:</strong> ${formatIndianCurrency(budget)}<br>
        <em>Estimates derived from Indian industry CPL benchmarks. Specific outcomes depend on category competition and sales qualification.</em>
      `;
    }
  }

  // Event Listeners
  if (budgetSlider) {
    budgetSlider.addEventListener('input', calculateOutputs);
  }

  serviceChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      const checkbox = chip.querySelector('input[type="checkbox"]');
      if (checkbox && e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
      }
      calculateOutputs();
      window.track('calc_interact', { budget: budgetSlider ? budgetSlider.value : 0 });
    });
  });

  // Claim Blueprint Button Hand-off
  if (claimBlueprintBtn) {
    claimBlueprintBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      const activeServices = [];
      serviceChips.forEach(chip => {
        const checkbox = chip.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) activeServices.push(checkbox.value);
      });

      const budget = budgetSlider ? parseInt(budgetSlider.value, 10) : 50000;

      // Pre-select service in form if 1 service, else 'all'
      const formService = document.getElementById('formService');
      if (formService) {
        formService.value = activeServices.length === 1 ? activeServices[0] : 'all';
      }

      // Pre-populate details
      const formDetails = document.getElementById('formDetails');
      if (formDetails) {
        formDetails.value = `[Claimed Blueprint Configuration]\nServices: ${activeServices.join(', ')}\nTarget Ad Budget: ${formatIndianCurrency(budget)} / mo\nPlease reach out with timeline and deliverables.`;
      }

      window.track('calc_claim', { services: activeServices.join(','), budget });

      // Smooth scroll to contact
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
        const nameField = document.getElementById('formName');
        if (nameField) setTimeout(() => nameField.focus(), 600);
      }
    });
  }

  // Initial Calculation Run on DOM ready
  calculateOutputs();
});
