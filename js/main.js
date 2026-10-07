/**
 * SAPVIK Main Interactive Script
 * Architectural Design System Implementation
 * Zero AI-Slop: Resilient, framework-free, high-performance interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Header scroll effect
  const siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // 2. Mobile Drawer Navigation
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const mobileDrawer = document.getElementById('mobileNavDrawer');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileDrawer.classList.toggle('open');
      mobileToggle.textContent = isOpen ? 'CLOSE ✕' : 'MENU ☰';
      mobileToggle.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
        mobileToggle.textContent = 'MENU ☰';
        mobileToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // 3. Active Nav Link Tracking on Scroll
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  if ('IntersectionObserver' in window && sections.length > 0) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${id}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, { threshold: 0.25 });

    sections.forEach(sec => navObserver.observe(sec));
  }

  // 4. FAQ Accordion (Supporting both .faq-row and .faq-item)
  const faqRows = document.querySelectorAll('.faq-row, .faq-item');
  faqRows.forEach(row => {
    const trigger = row.querySelector('.faq-trigger, .faq-question-btn');
    if (trigger) {
      trigger.addEventListener('click', () => {
        const isOpen = row.classList.contains('open');
        // Close others for clean single-expanded view
        faqRows.forEach(other => {
          other.classList.remove('open');
          const otherInd = other.querySelector('.faq-indicator, .faq-icon');
          if (otherInd) otherInd.textContent = '+';
        });

        if (!isOpen) {
          row.classList.add('open');
          const ind = row.querySelector('.faq-indicator, .faq-icon');
          if (ind) ind.textContent = '−';
        }
      });
    }
  });

  // 5. Toast Notification System
  function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : '!';
    toast.innerHTML = `
      <span style="color: var(--c-vermilion); font-weight: 700; font-family: var(--font-mono);">${icon}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // 6. Free Growth Audit Form Submission
  const auditForm = document.getElementById('auditForm');
  if (auditForm) {
    auditForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('formName');
      const phoneInput = document.getElementById('formPhone');
      const name = nameInput ? nameInput.value.trim() : '';
      const phone = phoneInput ? phoneInput.value.trim() : '';

      if (!name || !phone) {
        showToast('Please enter your Name and WhatsApp/Phone Number.', 'error');
        return;
      }

      showToast(`Audit request confirmed for ${name}. Our lead strategist will review your digital footprint and reach out within 2 hours.`, 'success');
      auditForm.reset();
    });
  }

  // 7. WhatsApp Instant Connect Handlers
  const whatsappBtns = document.querySelectorAll('.whatsapp-connect-btn');
  whatsappBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const phone = '919876543210';
      const defaultMsg = encodeURIComponent("Hello SAPVIK Team, I am interested in exploring your digital growth services (Websites, GMB, Promotions & Apps). I would like to schedule a growth audit.");
      window.open(`https://wa.me/${phone}?text=${defaultMsg}`, '_blank');
    });
  });
});
