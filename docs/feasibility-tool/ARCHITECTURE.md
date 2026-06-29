# BYLD Feasibility Engine — Architecture & Product Strategy

> Status: **living design doc**. This is the plan we iterate on. Today's website
> configurator is the Level-1 funnel; this document describes the path to a
> monetizable development-feasibility product.

---

## 1. What we are actually building

Not a "cost estimator". We are building a **development appraisal engine**: the
tool a developer uses to answer *"can I make money on this plot, how, and how
much can I pay for the land?"*

The single most important number in development is the **Residual Land Value
(RLV)** — the maximum a developer can pay for a site and still hit their target
profit:

```
RLV  =  GDV  −  ( Construction + Fees + Finance + Contingency
                  + Statutory/Planning costs + Sales/Marketing
                  + Developer's Profit )
```

Everything the tool does is in service of producing RLV, profit, margin, and a
cash-flow over time — and showing how the **BYLD build method changes those
numbers** (faster programme → less finance cost → higher profit/RLV).

This is a real, established software category. Reference products:
Argus Developer, MRI/Estate Master, **Aprao**, **LandTech / LandInsight**,
**TestFit / Forma (massing+yield)**. None of them are built around a modular
manufacturer's cost+speed advantage — that is BYLD's wedge.

---

## 2. The capability spectrum — how far can we realistically go

| Level | What it does | Realism | Moat |
|------|---------------|---------|------|
| **L1 — Estimator** *(today)* | Build-cost range from type/size/finish | Done | None (marketing) |
| **L2 — Quick feasibility** | RLV + profit + margin, single scenario, manual inputs, BYLD-vs-traditional delta | **Weeks.** High value, still mostly client-side | BYLD cost model |
| **L3 — Full appraisal (SaaS)** | Cash-flow over time, debt/equity finance, phasing, sensitivity (tornado), scenarios, saved projects, PDF export | **1–3 months** for MVP. This is already a sellable SaaS | Engine quality + UX + saved data |
| **L4 — Data-augmented** | Auto location cost factors, sales/rent comps, planning-rule library per municipality; map-based plot selection | **3–9 months**, ongoing. The expensive frontier — data is fragmented, geo-specific, partly licensed | **Proprietary planning + comps + cost data = the real moat** |
| **L5 — Generative feasibility** | Draw/upload a plot polygon → auto-generate compliant massing & unit yield under local planning rules → auto-appraise | **9+ months.** Hard in general; **much more tractable for BYLD** because the output is a kit-of-parts, not free-form architecture | Hard tech + BYLD systems = defensible |

**Honest read:** L2→L3 is very achievable and monetizable now. L4 is where the
durable business is, and where most of the cost/effort lives (data, not code).
L5 is the long-term differentiator and is *uniquely* feasible for BYLD because
the buildable output is standardized.

---

## 3. Domain model (the appraisal math)

The engine is organized around these input groups and outputs. All of this is
deterministic, testable, and should live in a **pure calculation core** with no
UI or network dependencies.

### Inputs

- **Site**: area, location (geo), tenure/acquisition cost, demolition/abnormals,
  planning status, constraints (buildable ratio / edificabilidad, height,
  density, setbacks, use class, protected/environmental).
- **Scheme**: use mix (resi / hospitality / commercial), Gross Internal Area
  (GIA), efficiency → Net Saleable/Lettable Area (NIA/NLA), unit mix
  (homes / keys / m² by type).
- **Revenue (GDV)**: sales values (€/m² or €/unit) **or** rent → yield → capital
  value; ground-floor/retail; absorption (sales/lease-up rate).
- **Construction**: build cost €/m² (**BYLD system vs traditional benchmark**),
  externals/site works, contingency %, professional fees %.
- **Statutory**: local taxes & planning contributions (Spain e.g. *ICIO*,
  *licencia de obras*, urbanization costs), VAT/IVA treatment.
- **Finance**: equity/debt split (LTC/LTV), interest rate, arrangement fees,
  term, drawdown profile.
- **Programme**: planning period, construction period, sales period — drives the
  finance cost and the IRR. **This is where BYLD's speed shows up.**
- **Profit target**: % on cost or on GDV (or solve for it).

### Outputs

- Residual Land Value (and "max bid")
- Profit, margin on cost, margin on GDV
- **IRR, equity multiple, peak debt, peak equity**
- Monthly/quarterly cash-flow + S-curve
- Sensitivity (tornado: sales value, build cost, yield, finance, programme)
- **Scenario comparison: BYLD vs Traditional** — Δ profit, Δ programme, Δ RLV
- Exportable report (PDF / shareable link)

---

## 4. System architecture (layers)

```
┌──────────────────────────────────────────────────────────────────┐
│  CLIENTS                                                            │
│  • Marketing site (Hugo)  → L1 funnel, drives signups              │
│  • Feasibility app (app.gobyld.com, Next.js/React) → L2–L5         │
└───────────────▲──────────────────────────────────────────────────┘
                │ HTTPS / JSON
┌───────────────┴──────────────────────────────────────────────────┐
│  API / APPLICATION LAYER  (Node/TS or Go)                          │
│  • Auth, accounts, teams, billing (Stripe)                         │
│  • Project CRUD, versioned appraisals, sharing                     │
│  • Runs the ENGINE server-side for paid tiers (protect IP)         │
│  • Lead/CRM events → BYLD sales (who is modelling what, where)     │
└───────────────▲───────────────────────────▲──────────────────────┘
                │                            │
┌───────────────┴───────────┐   ┌────────────┴──────────────────────┐
│  CALCULATION ENGINE        │   │  DATA / ASSUMPTIONS LIBRARIES      │
│  (pure, versioned, tested) │   │  (versioned, region-scoped)        │
│  • RLV / profit / cashflow │   │  • BYLD cost model (systems)       │
│  • finance, sensitivity    │   │  • Traditional cost benchmarks     │
│  • scenario engine         │   │  • Location/cost indices           │
│  ── THE CROWN-JEWEL IP ──  │   │  • Sales/rent comps (partner/user) │
│  Same package runs in      │   │  • Planning-rule library (per      │
│  browser (instant) AND     │   │    municipality) — Spain first     │
│  server (secure)           │   │  • Statutory cost/tax tables       │
└────────────────────────────┘   └────────────────────────────────────┘
                │
┌───────────────┴──────────────────────────────────────────────────┐
│  PERSISTENCE                                                        │
│  • Postgres (accounts, projects, appraisal snapshots, data libs)   │
│  • Object storage (reports, uploads, plot files)                   │
│  • PostGIS later (plots, parcels, constraints) for L4/L5           │
└────────────────────────────────────────────────────────────────────┘
```

### Key architectural principles

1. **The engine is a standalone package, not UI code.** A pure TypeScript
   module (`@byld/appraisal-engine`) with a typed input contract and full unit
   tests against worked examples. It must run unchanged in the browser (instant
   what-if for free users) and on the server (authoritative calc for paid tiers,
   so we don't ship the full model to the client).
2. **Data is versioned and region-scoped, separate from logic.** Cost, comps,
   planning, and tax tables change constantly and differ by jurisdiction. They
   are *data*, loaded by region + effective date, never hard-coded in the engine.
   Every appraisal snapshots the data-version it used (auditability).
3. **Everything is a scenario.** "BYLD vs Traditional" is just two parameter
   sets through the same engine. Scenario comparison is first-class.
4. **Progressive disclosure of accuracy.** L2 runs fully client-side from
   assumptions. L3+ pulls real data and persists. Same engine throughout.

### Tech stack (recommended evolution)

- **Keep** the Hugo marketing site; it stays the top-of-funnel.
- **Engine**: TypeScript, zero-dependency core, Vitest tests, published as an
  internal package.
- **App**: Next.js (React) on `app.gobyld.com`; charts via a lightweight lib.
- **Backend**: Next API routes or a small Node/Go service; **Postgres**
  (Supabase/Neon to start); **Stripe** for billing; **PostGIS** when L4 lands.
- **Auth**: managed (Clerk/Auth.js/Supabase Auth).
- This is a separate app/repo from the website — the website links to it.

---

## 5. The BYLD wedge (why this sells modular, not just software)

The tool monetizes **twice**:

1. **As software** — subscription/report revenue from developers & land agents.
2. **As a sales engine for construction** — every appraisal can show the
   *BYLD-build scenario* side-by-side with traditional: faster programme → lower
   finance cost → higher profit and higher RLV (i.e. *you can outbid rivals on
   the land because your build is faster/cheaper*). That is a quantified reason
   to build with BYLD, generated automatically, with the developer's own numbers.

So the tool is both a product **and** the most persuasive top-of-funnel BYLD has:
it tells a developer exactly how much more money they make by going modular.

---

## 6. Data strategy & the hard parts (be honest)

The code is the easy 30%. The business is in the data and its upkeep.

- **Construction cost** — BYLD's modular cost model is a genuine asset and
  already credible. Traditional benchmarks need sourcing & maintenance (cost
  indices, BCIS-style data, or curated internal benchmarks). *Tractable.*
- **Sales/rent comps** — fragmented and often licensed (e.g. Idealista,
  registry data, CBRE/Savills in Spain). Strategy: **user-input first**, then
  optional data partnerships / scraping where legal. *Hard, ongoing.*
- **Planning rules** — *the deepest moat and deepest cost.* No clean national
  API; Spain works at the municipal level (PGOU: edificabilidad, usos,
  alturas). Strategy: build a **planning-rule library municipality-by-
  municipality, starting with Madrid + BYLD's target markets.** Curated, not
  fully automated, at first. *Hard, high-value.*
- **Maintenance is the real cost** — data freshness, not features, is the
  operating expense. Budget for a data-ops function early.

**Liability:** appraisals drive investment decisions. Keep "indicative" framing,
clear assumptions, snapshotted data versions, and a **human-in-the-loop (BYLD
review)** for paid/branded reports. Don't position as regulated valuation advice.

---

## 7. Monetization & packaging

| Tier | Who | What | Price logic |
|------|-----|------|-------------|
| **Funnel (free, gated)** | Anyone | L1/L2 quick feasibility; captures lead + plot intel for BYLD | Free → lead value |
| **Pro (SaaS)** | Developers, land agents | L3 full appraisal, saved projects, scenarios, export | Per-seat / month |
| **Reports** | Occasional users | Paid per-site feasibility report (optionally BYLD-reviewed) | Per report |
| **Data/white-label** | Agents, partners | Branded tool / API access | Enterprise |
| **Construction conversion** | — | BYLD wins the build because the tool proved the uplift | The real prize |

**Defensibility** compounds over time: proprietary BYLD cost model + accumulated
appraisal data + planning-rule library + (eventually) generative massing.

---

## 8. Roadmap (crawl → walk → run)

- **Phase 0 — now**: L1 estimator on the website as lead funnel. *(done)*
- **Phase 1 — weeks**: Build the **engine package** (RLV, profit, margin,
  BYLD-vs-traditional), Spain/Madrid default assumptions, manual inputs,
  worked-example tests. Surface as a gated "Quick feasibility" on the site
  (still client-side). *Big credibility leap, low infra.*
- **Phase 2 — 1–3 months**: Stand up the **app** — accounts, saved projects,
  full cash-flow appraisal, finance, sensitivity, PDF export, Stripe. Standalone
  SaaS MVP. Server-side engine for paid tiers.
- **Phase 3 — 3–9 months**: **Data augmentation** — location cost factors,
  comps (partnership/user libraries), planning-rule library for target
  municipalities, map-based plot input (PostGIS).
- **Phase 4 — 9+ months**: **Generative feasibility** — plot polygon → BYLD
  kit-of-parts massing & yield → auto-appraisal; scenario optimization.

---

## 9. Immediate next step

Build **Phase 1: the appraisal engine** as a standalone, tested TypeScript
package with a typed input/output contract — because it is the crown-jewel IP,
it's reusable across the website (free tier) and the future app (paid tiers),
and a worked, test-backed RLV/cash-flow model is the thing that turns this from
a marketing toy into a credible product.

Open decisions that shape the build (see chat):
1. **Geography first** (Spain/Madrid recommended — aligns data + BYLD market).
2. **Monetization priority** (BYLD lead-funnel vs standalone SaaS vs both).
3. **Build now vs spec-only** for Phase 1.
