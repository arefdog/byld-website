// Dropdown menu (three-dot button)
(function () {
  const btn = document.querySelector('.menu-btn');
  const menu = document.querySelector('.dropdown-menu');
  if (!btn || !menu) return;

  function setOpen(open) {
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) {
      menu.hidden = false;
      void menu.offsetHeight;                 // reflow so the transition plays
      menu.classList.add('open');
    } else {
      menu.classList.remove('open');
      setTimeout(function () { if (!menu.classList.contains('open')) menu.hidden = true; }, 220);
    }
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!menu.classList.contains('open'));
  });
  menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { setOpen(false); });
  });
  document.addEventListener('click', function (e) {
    if (menu.classList.contains('open') && !menu.contains(e.target) && e.target !== btn) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('open')) setOpen(false);
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

// Collaborator portal — client-side password gate (obfuscation, not real
// security: this is a public static site). Compares SHA-256 of the input
// against the stored hash; unlock persists for the browser session.
(function () {
  var root = document.querySelector('[data-portal]');
  if (!root) return;
  var expected = (root.getAttribute('data-hash') || '').toLowerCase();
  var lock = root.querySelector('.portal-lock');
  var content = root.querySelector('.portal-content');
  var form = root.querySelector('.portal-form');
  var err = root.querySelector('.portal-error');
  var KEY = 'byld-portal-' + expected.slice(0, 8);

  function unlock() { lock.hidden = true; content.hidden = false; }
  try { if (sessionStorage.getItem(KEY) === '1') unlock(); } catch (e) {}

  function sha256(str) {
    var data = new TextEncoder().encode(str);
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    sha256(form.password.value).then(function (h) {
      if (h === expected) {
        try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
        unlock();
      } else {
        err.hidden = false;
        form.password.value = '';
        form.password.focus();
      }
    });
  });
})();

// Overlay header: solidify once scrolled past the hero top (homepage only)
(function () {
  if (!document.body.classList.contains('home-hero')) return;
  var header = document.querySelector('.site-header');
  if (!header) return;
  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

// Image carousels
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Array.prototype.forEach.call(document.querySelectorAll('[data-carousel]'), function (car) {
    var track = car.querySelector('.carousel-track');
    var slides = car.querySelectorAll('.carousel-slide');
    var dots = car.querySelectorAll('.carousel-dot');
    var n = slides.length;
    if (n < 2) return;
    var idx = 0, timer = null;

    function go(i) {
      idx = (i + n) % n;
      track.style.transform = 'translateX(' + (-idx * 100) + '%)';
      Array.prototype.forEach.call(dots, function (d, j) { d.classList.toggle('is-active', j === idx); });
    }
    function start() { if (!reduce) timer = setInterval(function () { go(idx + 1); }, 5000); }
    function stop() { clearInterval(timer); }
    function reset() { stop(); start(); }

    var next = car.querySelector('.carousel-next');
    var prev = car.querySelector('.carousel-prev');
    if (next) next.addEventListener('click', function () { go(idx + 1); reset(); });
    if (prev) prev.addEventListener('click', function () { go(idx - 1); reset(); });
    Array.prototype.forEach.call(dots, function (d, j) { d.addEventListener('click', function () { go(j); reset(); }); });
    car.addEventListener('mouseenter', stop);
    car.addEventListener('mouseleave', start);
    start();
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
