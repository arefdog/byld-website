// Mobile nav toggle
(function () {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.mobile-nav');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', function () {
    const open = menu.classList.toggle('open');
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  // Close on link click
  menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      menu.classList.remove('open');
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
})();

// Contact form — AJAX submit with inline success/error (when an https
// endpoint is configured). Falls back to the native mailto: form otherwise.
(function () {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  const action = form.getAttribute('action') || '';
  if (!/^https?:/i.test(action)) return; // mailto fallback: let the browser handle it

  function notice(cls, text) {
    let el = form.querySelector('.form-status');
    if (!el) {
      el = document.createElement('p');
      el.className = 'form-status';
      form.appendChild(el);
    }
    el.className = 'form-status ' + cls;
    el.textContent = text;
    return el;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    notice('is-pending', 'Sending your enquiry…');

    fetch(action, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form)
    }).then(function (r) {
      if (r.ok) {
        form.reset();
        const ok = notice('is-success', 'Thanks — your enquiry is with our team. We’ll be in touch shortly.');
        Array.prototype.forEach.call(form.querySelectorAll('.field, .field-row'), function (n) { n.style.display = 'none'; });
        btn.style.display = 'none';
        ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        notice('is-error', 'Something went wrong. Please email ' + (form.dataset.email || 'us') + '.');
        btn.disabled = false; btn.textContent = original;
      }
    }).catch(function () {
      notice('is-error', 'Network error. Please email ' + (form.dataset.email || 'us') + '.');
      btn.disabled = false; btn.textContent = original;
    });
  });
})();

// Reveal-on-scroll (respects prefers-reduced-motion)
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  const targets = document.querySelectorAll('.section-head, .card, .system, .press-card, .process-step, .sustain-list li, .hero-copy, .hero-media');
  if (!targets.length) return;

  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  targets.forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
})();

// Audience tabs
(function () {
  const tabs = Array.prototype.slice.call(document.querySelectorAll('.audience-tab'));
  const panels = Array.prototype.slice.call(document.querySelectorAll('.audience-panel'));
  if (!tabs.length) return;

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      const targetId = tab.getAttribute('data-target');
      tabs.forEach(function (t) {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      panels.forEach(function (p) {
        p.classList.toggle('is-active', p.id === targetId);
      });
    });
  });
})();
