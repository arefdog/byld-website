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
