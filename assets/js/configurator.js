/* BYLD project configurator — multi-step estimate with gated lead capture */
(function () {
  var root = document.querySelector("[data-configurator]");
  if (!root) return;

  var cfgEl = document.getElementById("pricing-config");
  if (!cfgEl) return;
  var CFG;
  try { CFG = JSON.parse(cfgEl.textContent); } catch (e) { return; }

  var shell = root.querySelector(".config-shell");
  var stage = root.querySelector(".config-stage");
  var bar = root.querySelector(".config-progress-bar");
  shell.hidden = false;

  var formAction = (root.getAttribute("data-form-action") || "").trim();
  var email = root.getAttribute("data-email") || "";

  // ---- state ----
  var state = {
    step: 0,
    system: null,
    area: null,
    finish: "signature",
    site: "flat",
    region: "spain",
    submitted: false
  };
  var STEPS = ["Building type", "Scale", "Specification", "Your estimate"];

  // ---- helpers ----
  function sys() { return CFG.systems.filter(function (s) { return s.key === state.system; })[0]; }
  function byKey(list, key) { return list.filter(function (x) { return x.key === key; })[0]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  function fmtMoney(n) {
    var sym = CFG.currencySymbol || "€";
    if (n >= 1e6) return sym + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
    return sym + Math.round(n / 1000) + "k";
  }
  function fmtFull(n) {
    return (CFG.currencySymbol || "€") + Math.round(n).toLocaleString("en-US");
  }

  function effRate() {
    var s = sys();
    return s.rate * byKey(CFG.finishes, state.finish).mult *
      byKey(CFG.sites, state.site).mult * byKey(CFG.regions, state.region).mult;
  }
  function pointEstimate() { return state.area * effRate(); }

  function unitsText() {
    var s = sys();
    if (!s.unitSize || !s.unitLabel) return "";
    return "≈ " + Math.max(1, Math.round(state.area / s.unitSize)) + " " + s.unitLabel;
  }

  // ---- step renderers ----
  function renderType() {
    var cards = CFG.systems.map(function (s) {
      var active = state.system === s.key ? " is-selected" : "";
      return '<button type="button" class="config-card' + active + '" data-pick-system="' + s.key + '">' +
        '<span class="config-card-sector">' + esc(s.sector) + "</span>" +
        '<span class="config-card-name">' + esc(s.name) + "</span>" +
        '<span class="config-card-blurb">' + esc(s.blurb) + "</span>" +
        "</button>";
    }).join("");
    return '<h3 class="config-q">What are you building?</h3>' +
      '<div class="config-cards">' + cards + "</div>";
  }

  function renderScale() {
    var s = sys();
    var a = s.area;
    return '<h3 class="config-q">Roughly how big?</h3>' +
      '<div class="config-slider">' +
        '<div class="config-readout"><span class="config-area">' + state.area.toLocaleString("en-US") +
        ' m²</span><span class="config-units">' + esc(unitsText()) + "</span></div>" +
        '<input type="range" min="' + a.min + '" max="' + a.max + '" step="' + a.step +
        '" value="' + state.area + '" data-area>' +
        '<div class="config-slider-ends"><span>' + a.min.toLocaleString("en-US") + ' m²</span><span>' +
        a.max.toLocaleString("en-US") + ' m²</span></div>' +
      "</div>";
  }

  function optionRow(label, list, key, stateKey) {
    var opts = list.map(function (o) {
      var active = state[stateKey] === o.key ? " is-selected" : "";
      var desc = o.desc ? '<span class="config-opt-desc">' + esc(o.desc) + "</span>" : "";
      return '<button type="button" class="config-opt' + active + '" data-opt="' + stateKey + '" data-val="' + o.key + '">' +
        '<span class="config-opt-name">' + esc(o.name) + "</span>" + desc + "</button>";
    }).join("");
    return '<div class="config-group"><span class="config-group-label">' + esc(label) + "</span>" +
      '<div class="config-opts">' + opts + "</div></div>";
  }

  function renderSpec() {
    return '<h3 class="config-q">Specify your project</h3>' +
      optionRow("Finish level", CFG.finishes, "finish", "finish") +
      optionRow("Site conditions", CFG.sites, "site", "site") +
      optionRow("Region", CFG.regions, "region", "region");
  }

  function renderEstimate() {
    var pt = pointEstimate();
    var lo = pt * CFG.rangeLow, hi = pt * CFG.rangeHigh;
    var s = sys();
    var summary = [s.name + " · " + s.sector, state.area.toLocaleString("en-US") + " m²",
      byKey(CFG.finishes, state.finish).name, byKey(CFG.sites, state.site).name,
      byKey(CFG.regions, state.region).name].join(" · ");

    if (!state.submitted) {
      return '<h3 class="config-q">Your indicative estimate is ready</h3>' +
        '<p class="config-summary">' + esc(summary) + "</p>" +
        '<div class="config-result is-locked">' +
          '<div class="config-figure config-blur">' + fmtMoney(lo) + " – " + fmtMoney(hi) + "</div>" +
          '<div class="config-lock">' +
            '<form class="config-form" novalidate>' +
              '<p class="config-form-lead">Enter your details to reveal your estimate. We’ll send a detailed breakdown.</p>' +
              '<div class="config-field-row">' +
                '<label class="field"><span>Name</span><input type="text" name="name" required></label>' +
                '<label class="field"><span>Email</span><input type="email" name="email" required></label>' +
              "</div>" +
              '<div class="config-field-row">' +
                '<label class="field"><span>Phone (optional)</span><input type="tel" name="phone"></label>' +
                '<label class="field"><span>Company (optional)</span><input type="text" name="company"></label>' +
              "</div>" +
              '<button type="submit" class="btn btn-primary">Reveal my estimate</button>' +
              '<p class="config-error" hidden></p>' +
            "</form>" +
          "</div>" +
        "</div>" +
        '<p class="config-disclaimer">' + esc(CFG.disclaimer) + "</p>";
    }

    return '<h3 class="config-q">Your indicative estimate</h3>' +
      '<p class="config-summary">' + esc(summary) + "</p>" +
      '<div class="config-result">' +
        '<div class="config-figure">' + fmtFull(lo) + " – " + fmtFull(hi) + "</div>" +
        '<div class="config-figure-sub">≈ ' + fmtFull(effRate()) + " / m²" +
        (unitsText() ? " · " + esc(unitsText()) : "") + "</div>" +
      "</div>" +
      '<div class="config-success">Thanks — your details are with our team. We’ll be in touch with a detailed estimate shortly.</div>' +
      '<p class="config-disclaimer">' + esc(CFG.disclaimer) + "</p>";
  }

  // ---- chrome (progress + nav) ----
  function render() {
    var body;
    if (state.step === 0) body = renderType();
    else if (state.step === 1) body = renderScale();
    else if (state.step === 2) body = renderSpec();
    else body = renderEstimate();

    var pct = ((state.step + 1) / STEPS.length) * 100;
    bar.style.width = pct + "%";

    var nav = '<div class="config-nav">';
    nav += state.step > 0
      ? '<button type="button" class="btn btn-ghost btn-sm" data-back>← Back</button>'
      : "<span></span>";
    if (state.step < 3) {
      var disabled = state.step === 0 && !state.system ? " disabled" : "";
      nav += '<button type="button" class="btn btn-primary btn-sm" data-next' + disabled + ">Next →</button>";
    } else {
      nav += "<span></span>";
    }
    nav += "</div>";

    stage.innerHTML =
      '<div class="config-step-meta">Step ' + (state.step + 1) + " of " + STEPS.length +
      ' · ' + esc(STEPS[state.step]) + "</div>" + body + nav;
  }

  // ---- lead submission ----
  function buildPayload(form) {
    var s = sys(), pt = pointEstimate();
    return {
      name: form.name.value,
      email: form.email.value,
      phone: form.phone.value,
      company: form.company.value,
      _subject: "New BYLD estimate enquiry — " + s.name,
      building_type: s.name + " (" + s.sector + ")",
      area_m2: state.area,
      units: unitsText(),
      finish: byKey(CFG.finishes, state.finish).name,
      site: byKey(CFG.sites, state.site).name,
      region: byKey(CFG.regions, state.region).name,
      estimate_low: fmtFull(pt * CFG.rangeLow),
      estimate_high: fmtFull(pt * CFG.rangeHigh),
      source: "Website configurator"
    };
  }

  function sendLead(form, onDone, onError) {
    var payload = buildPayload(form);
    if (formAction) {
      fetch(formAction, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      }).then(function (r) { r.ok ? onDone() : onError(); }).catch(onError);
    } else {
      // No endpoint configured: open a pre-filled email, then reveal anyway.
      var lines = Object.keys(payload).map(function (k) { return k + ": " + payload[k]; }).join("\n");
      window.location.href = "mailto:" + email +
        "?subject=" + encodeURIComponent(payload._subject) +
        "&body=" + encodeURIComponent(lines);
      onDone();
    }
  }

  // ---- events ----
  stage.addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;

    if (t.hasAttribute("data-pick-system")) {
      state.system = t.getAttribute("data-pick-system");
      state.area = sys().area.default;
      render();
    } else if (t.hasAttribute("data-opt")) {
      state[t.getAttribute("data-opt")] = t.getAttribute("data-val");
      render();
    } else if (t.hasAttribute("data-next")) {
      if (state.step === 0 && !state.system) return;
      state.step++; render();
    } else if (t.hasAttribute("data-back")) {
      state.step--; render();
    }
  });

  stage.addEventListener("input", function (e) {
    if (e.target.hasAttribute("data-area")) {
      state.area = parseInt(e.target.value, 10);
      var ro = stage.querySelector(".config-area");
      var un = stage.querySelector(".config-units");
      if (ro) ro.textContent = state.area.toLocaleString("en-US") + " m²";
      if (un) un.textContent = unitsText();
    }
  });

  stage.addEventListener("submit", function (e) {
    if (!e.target.classList.contains("config-form")) return;
    e.preventDefault();
    var form = e.target;
    var err = form.querySelector(".config-error");
    if (!form.name.value.trim() || !form.email.value.trim() || !form.email.checkValidity()) {
      err.textContent = "Please enter your name and a valid email.";
      err.hidden = false;
      return;
    }
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = "Sending…";
    sendLead(form, function () {
      state.submitted = true; render();
    }, function () {
      err.textContent = "Something went wrong. Please email " + email + ".";
      err.hidden = false;
      btn.disabled = false; btn.textContent = "Reveal my estimate";
    });
  });

  render();
})();
