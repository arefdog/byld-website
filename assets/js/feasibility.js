/* BYLD feasibility tool — browser port of @byld/appraisal-engine (v0.1).
   Mirrors the standalone engine; should later be replaced by a bundled build
   of the TypeScript package so there is a single source of truth. */
(function () {
  var form = document.getElementById("feaso-form");
  if (!form) return;

  // --- Spain/Madrid data pack (indicative; mirror of src/data/spain.ts) ---
  var DATA = {
    buildCost: {
      residential: { traditional: 1800, byld: 1650 },
      hospitality: { traditional: 2600, byld: 2350 },
      commercial: { traditional: 2000, byld: 1850 },
      retail: { traditional: 1500, byld: 1400 },
    },
    efficiency: { residential: 0.85, hospitality: 0.7, commercial: 0.85, retail: 0.9 },
    programme: { planning: 9, sales: 9, baseConstruction: 6, sqmPerMonth: 900, byldSpeedFactor: 0.6 },
    d: { externals: 0.1, contingency: 0.05, fees: 0.1, tax: 0.05, salesCost: 0.03,
         debt: 0.65, rate: 0.075, arrFee: 0.01 },
  };

  // --- finance: monthly cash-flow ---
  function smoothstep(x) { return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); }
  function sCurve(n) {
    if (n <= 0) return []; if (n === 1) return [1];
    var w = [], prev = 0;
    for (var i = 1; i <= n; i++) { var c = smoothstep(i / n); w.push(c - prev); prev = c; }
    return w;
  }
  function even(n) { return n <= 0 ? [] : new Array(n).fill(1 / n); }

  function cashflow(p) {
    var planning = Math.round(p.planning), construction = Math.max(1, Math.round(p.construction)),
        sales = Math.max(1, Math.round(p.sales));
    var buildStart = planning, buildEnd = planning + construction, salesStart = buildEnd,
        totalMonths = Math.max(buildEnd, salesStart + sales);
    var out = new Array(totalMonths + 1).fill(0), inn = new Array(totalMonths + 1).fill(0);
    out[0] += p.land;
    out[Math.min(buildStart, totalMonths)] += p.upfront;
    var cw = sCurve(construction);
    for (var i = 0; i < construction; i++) out[buildStart + i] += p.constructionSpread * cw[i];
    var fm = Math.max(1, planning + construction), fw = even(fm);
    for (i = 0; i < fm; i++) out[i] += p.feesSpread * fw[i];
    var rw = even(sales);
    for (i = 0; i < sales; i++) inn[salesStart + i] += p.revenue * rw[i];

    var mRate = p.rate / 12, debt = 0, totalInterest = 0, peakDebt = 0, equityNet = [];
    for (var m = 0; m <= totalMonths; m++) {
      var interest = debt * mRate; debt += interest; totalInterest += interest;
      var eqOut = 0, eqIn = 0;
      if (out[m] > 0) {
        var headroom = Math.max(0, p.debtCap - debt);
        var drawn = Math.min(out[m] * p.debtRatio, headroom);
        debt += drawn; eqOut = out[m] - drawn;
      }
      if (inn[m] > 0) { var repay = Math.min(inn[m], debt); debt -= repay; eqIn = inn[m] - repay; }
      peakDebt = Math.max(peakDebt, debt);
      equityNet.push(eqIn - eqOut);
    }
    return { totalInterest: totalInterest, peakDebt: peakDebt, totalMonths: totalMonths, equityNet: equityNet };
  }

  function irrAnnual(flow) {
    if (!flow.some(function (v) { return v > 0; }) || !flow.some(function (v) { return v < 0; })) return null;
    var npv = function (r) { return flow.reduce(function (a, v, i) { return a + v / Math.pow(1 + r, i); }, 0); };
    var lo = -0.9, hi = 1.0, fLo = npv(lo); if (fLo * npv(hi) > 0) return null;
    for (var i = 0; i < 200; i++) {
      var mid = (lo + hi) / 2, f = npv(mid);
      if (Math.abs(f) < 1e-6) { lo = hi = mid; break; }
      if (fLo * f < 0) hi = mid; else { lo = mid; fLo = f; }
    }
    return Math.pow(1 + (lo + hi) / 2, 12) - 1;
  }

  // --- appraisal (residual mode, profit on GDV) ---
  function appraise(o) {
    var eff = DATA.efficiency[o.use];
    var saleable = o.area * eff;
    var gdv = saleable * o.price;
    var salesCosts = gdv * DATA.d.salesCost;
    var ndv = gdv - salesCosts;

    var rate = DATA.buildCost[o.use][o.method];
    var build = o.area * rate;
    var externals = build * DATA.d.externals;
    var base = build + externals;
    var contingency = base * DATA.d.contingency;
    var fees = base * DATA.d.fees;
    var statutory = base * DATA.d.tax;
    var constructionSpread = base + contingency;
    var hardSoft = base + contingency + fees + statutory;

    var pr = DATA.programme;
    var construction = (pr.baseConstruction + o.area / pr.sqmPerMonth) * (o.method === "byld" ? pr.byldSpeedFactor : 1);

    var finance = function (land) {
      var debtCap = DATA.d.debt * (land + hardSoft);
      var cf = cashflow({
        land: land, constructionSpread: constructionSpread, feesSpread: fees,
        upfront: statutory, revenue: ndv, planning: pr.planning, construction: construction,
        sales: pr.sales, debtCap: debtCap, debtRatio: DATA.d.debt, rate: DATA.d.rate,
      });
      return { cf: cf, cost: cf.totalInterest + debtCap * DATA.d.arrFee };
    };

    // iterate residual land (finance depends on land)
    var land = Math.max(0, ndv - hardSoft - gdv * o.profitPct), f;
    for (var i = 0; i < 50; i++) {
      f = finance(land);
      var next = ndv - hardSoft - f.cost - gdv * o.profitPct;
      if (Math.abs(next - land) < 1) { land = next; break; }
      land = next;
    }
    f = finance(land);
    var profit = ndv - (land + hardSoft + f.cost);

    return {
      gdv: gdv, ndv: ndv, saleable: saleable, land: land, profit: profit,
      marginGdv: gdv > 0 ? profit / gdv : 0,
      construction: base, contingency: contingency, fees: fees, statutory: statutory,
      salesCosts: salesCosts, finance: f.cost, peakDebt: f.cf.peakDebt,
      programme: f.cf.totalMonths, irr: irrAnnual(f.cf.equityNet),
    };
  }

  // --- formatting ---
  function eur(n) {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  }
  function eurM(n) {
    if (Math.abs(n) >= 1e6) return "€" + (n / 1e6).toFixed(2) + "M";
    return "€" + Math.round(n / 1000) + "k";
  }
  function pct(n) { return (n * 100).toFixed(1) + "%"; }
  var $ = function (id) { return document.getElementById(id); };

  // --- compute + render ---
  function run() {
    var o = {
      use: $("f-use").value,
      area: parseFloat($("f-area").value),
      price: parseFloat($("f-price").value) || 0,
      profitPct: parseFloat($("f-profit").value) / 100,
    };
    $("f-area-out").textContent = o.area.toLocaleString("en-US");
    $("f-profit-out").textContent = Math.round(o.profitPct * 100);

    var byld = appraise(Object.assign({}, o, { method: "byld" }));
    var trad = appraise(Object.assign({}, o, { method: "traditional" }));

    $("o-rlv").textContent = byld.land > 0 ? eur(byld.land) : "Not viable";
    $("o-rlv-sub").textContent = "≈ " + eur(byld.land / o.area) + " / m² of GIA";
    $("o-gdv").textContent = eurM(byld.gdv);
    $("o-profit").textContent = eurM(byld.profit);
    $("o-programme").textContent = byld.programme + " mo";
    $("o-finance").textContent = eurM(byld.finance);
    $("o-peakdebt").textContent = eurM(byld.peakDebt);
    $("o-irr").textContent = byld.irr != null ? pct(byld.irr) : "n/a";

    $("o-rlv-trad").textContent = eur(trad.land);
    $("o-rlv-byld").textContent = eur(byld.land);
    var dLand = byld.land - trad.land, dMonths = trad.programme - byld.programme;
    $("o-wedge").innerHTML = "Building with BYLD, you can bid <strong>" + eur(dLand) +
      "</strong> more for the land and still hit your target — and finish about <strong>" +
      dMonths + " months</strong> sooner.";

    var rows = [
      ["Gross development value (GDV)", byld.gdv],
      ["Construction (build + externals)", -byld.construction],
      ["Contingency", -byld.contingency],
      ["Professional fees", -byld.fees],
      ["Statutory (ICIO + licencia)", -byld.statutory],
      ["Sales & marketing", -byld.salesCosts],
      ["Finance", -byld.finance],
      ["Developer profit", -byld.profit],
      ["= Residual land value", byld.land],
    ];
    $("o-breakdown").innerHTML = rows.map(function (r, i) {
      var strong = i === rows.length - 1 ? ' class="is-total"' : "";
      return "<tr" + strong + "><td>" + r[0] + "</td><td>" + eur(r[1]) + "</td></tr>";
    }).join("");

    window.__feaso = { inputs: o, byld: byld, trad: trad };
  }

  ["f-use", "f-area", "f-price", "f-profit"].forEach(function (id) {
    $(id).addEventListener("input", run);
  });
  run();

  // --- lead capture ---
  var leadForm = document.getElementById("feaso-lead-form");
  if (leadForm) {
    leadForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = leadForm.querySelector(".config-error");
      var ok = leadForm.querySelector(".feaso-success");
      if (!leadForm.name.value.trim() || !leadForm.email.checkValidity()) {
        err.textContent = "Please enter your name and a valid email."; err.hidden = false; return;
      }
      err.hidden = true;
      var s = window.__feaso || {};
      var payload = {
        name: leadForm.name.value, email: leadForm.email.value, location: leadForm.location.value,
        _subject: "Feasibility appraisal request",
        building_type: s.inputs && s.inputs.use, area_m2: s.inputs && s.inputs.area,
        sale_value_per_m2: s.inputs && s.inputs.price,
        residual_land_value_byld: s.byld && Math.round(s.byld.land),
        residual_land_value_traditional: s.trad && Math.round(s.trad.land),
        profit_byld: s.byld && Math.round(s.byld.profit), source: "Feasibility tool",
      };
      var action = leadForm.getAttribute("data-form-action");
      var email = leadForm.getAttribute("data-email");
      var btn = leadForm.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = "Sending…";
      var done = function () { ok.hidden = false; btn.style.display = "none"; };
      var fail = function () { err.textContent = "Something went wrong. Please email " + email + "."; err.hidden = false; btn.disabled = false; btn.textContent = "Send me the full appraisal"; };
      if (action) {
        fetch(action, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) })
          .then(function (r) { r.ok ? done() : fail(); }).catch(fail);
      } else {
        var body = Object.keys(payload).map(function (k) { return k + ": " + payload[k]; }).join("\n");
        window.location.href = "mailto:" + email + "?subject=" + encodeURIComponent(payload._subject) + "&body=" + encodeURIComponent(body);
        done();
      }
    });
  }
})();
