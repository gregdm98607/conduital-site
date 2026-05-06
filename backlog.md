# Conduital Site — Backlog & v1 Roadmap

**Owners:** Acting CRO + acting CMO/Design
**Date:** 2026-05-05
**Inputs:** live audit of conduital.com, source review of `src/`, FAQ/About/Download/Footer, Gumroad listing, schema/SEO metadata.
**Purpose:** This file is the source-of-truth for site improvements. `next-prompt.md` writes pull from here going forward.

---

## TL;DR — Top Findings

1. **Product identity contradicts itself across pages.** The hero says "Notion-based operating system," the FAQ says "local-first markdown files," the Download page ships a Windows `.exe`, and the home-page JSON-LD claims "Web, iOS, Android" with `price: 0`. A first-time visitor cannot tell what they're buying. **This is the single biggest revenue blocker.**
2. **No price anywhere on the marketing site.** Every CTA punts to Gumroad. Visitors must leave to learn cost. No price anchor, no risk-reducer (refund/guarantee), no tier comparison.
3. **Two visible placeholder/broken elements** — Footer ConvertKit form has `action="#"` + TODO comment; footer Twitter link is `href="#"`. Both ship to production today.
4. **No social proof at all** — no testimonials, no user count, no reviews, no logos, no Product Hunt badge, no creator photo.
5. **Interactive demos are clever but lonely.** Momentum demo + chaos slider are the most memorable parts of the page, but the rest of the funnel doesn't reinforce them with outcome stories or proof.

---

## P0 — Conversion-blocking. Fix this week.

### CRO-1. Resolve the product-identity contradiction
- Decide canonically: is Conduital a **Windows desktop app**, a **Notion template**, or both? (Code says Windows; Gumroad tagline says "AI-Powered Productivity System"; hero says "Notion-based.")
- Once decided, rewrite hero subheadline, FAQ, About, schema (`@type`, `operatingSystem`, `offers.price`), and Gumroad listing in lockstep.
- File-level edits: `src/pages/index.astro` (hero + JSON-LD), `src/pages/faq.astro`, `src/pages/about.astro`, `src/consts.ts`.

### CRO-2. Show the price on the marketing site
- Add a pricing block above the bottom CTA (or replace `built-by` placement) with the real number, what's included, and a one-line refund/guarantee.
- If tiered (FAQ implies "free tier" + paid tiers), show a 2- or 3-column compare. Otherwise show the single price prominently.
- Update CTAs from "Get Conduital →" to "Get Conduital — $XX" so the price travels with the click.

### CRO-3. Fix the two placeholder elements in the footer
- `src/components/Footer.astro`: wire the ConvertKit form to the same `/api/subscribe` endpoint the hero uses (or remove it — two email captures dilute conversion anyway).
- Replace `href="#"` Twitter link with the real handle, or remove the icon.

### CRO-4. Add risk-reducer language next to every primary CTA
- One-liner under each CTA: "30-day refund. No subscription. Yours forever." (or whatever's true).
- Without it, visitors hesitate at Gumroad.

### CMO-1. Replace placeholder schema/OG metadata
- `JSON-LD` on `index.astro` currently lies about platform and price. Either correct it or remove it — incorrect structured data hurts SEO trust.
- Generate a real OG image that matches the hero (currently single `og-image.png` shared across all pages).

---

## P1 — Important. Fix this sprint.

### CRO-5. Add social proof above the fold (or just below it)
- Even one real testimonial with a face and a job title outperforms zero. If we don't have any yet, run a 1-week ask to early users via the existing email list.
- Sub-elements once available: testimonial carousel, "Used by N knowledge workers" counter (only if true), Product Hunt badge, screenshot callouts of customer Notion/file workspaces.

### CRO-6. Build a "How It Works" 3-step section
- Visitors see chaos→clarity but don't see the **user journey**. Add a 3-step: (1) Capture, (2) Conduital routes & scores, (3) You ship. One sentence + one micro-screenshot per step.
- Insert between "Built for How You Actually Work" and "Feel the Momentum."

### CRO-7. Add an explicit "Who it's for / not for" block
- Borrowed from the About page copy. Filtering out the wrong-fit visitors raises buyer quality and reduces refunds.

### CRO-8. Outbound-link tracking on every CTA
- Wire Vercel Analytics custom events (or GA4 events) for: hero CTA, bottom CTA, header CTA, Gumroad outbound, email submit success/error, comparison-slider drag, momentum-demo task complete.
- Without events we can't tell which interaction drives Gumroad clicks.

### CMO-2. Real creator photo on the About page
- Replace `GM` initials avatar on the **About page** with an actual photo of Greg. The About page is where the creator narrative lives; a face there is high-trust.
- ~~Originally also covered the home page; superseded by **CMO-10** which depersonalizes the home-page "Built by" block.~~

### CMO-3. Tighten the hero
- Subheadline is 3 sentences and hedges. Tighten to one sentence + a value-bullet trio. Currently: "Stop managing tasks. Start building results." is the best line and should lead.
- Move the email capture below the primary CTA into a single visual element — currently there's a CTA, then "Or get notified," then a form, then status text, then a screenshot. Too many decisions.

### CMO-4. Replace the cartoonish "before" mockup in the comparison slider
- The chaos mockup uses CSS sticky-notes that look made-up. Use a real (anonymized) screenshot of a typical messy Notion workspace or a stylized but believable one. The current one undersells the contrast.

### CMO-5. Mobile QA pass on the whole funnel
- Comparison slider squeezes on mobile (`aspect-ratio: 4/3` at 640px). Momentum demo tasks wrap awkwardly on iPhone SE width. Header CTA shows on scroll only — verify it's still tappable above the mobile nav.

### Customer-Care-1. Add a public changelog
- New page `src/pages/changelog.astro`. Pull entries from a markdown collection (`src/content/changelog/`) so updates ship like blog posts.
- Existing customers want to know what's in v1.4.1. Right now there's nothing.

### Customer-Care-2. Docs link in header
- FAQ mentions a weekly review co-pilot, GTD workflows, Horizons of Focus. None of that is documented on the site. Stub a `/docs` index that at minimum links to the FAQ + a "Getting Started" page.

### CMO-10. Depersonalize the home-page "Built by" section
- Edit the `built-by` section in [src/pages/index.astro](src/pages/index.astro) (lines ~637–648). Today it reads:
  > **Built by a Knowledge Worker, for Knowledge Workers**
  > **GM** · **Greg Maxfield** — Creator of Conduital. I built this because I was drowning in productivity tools that didn't talk to each other. Conduital is the system I wished existed — one place where your projects, tasks, and knowledge actually work together.
- Remove the `creator-card` block entirely — no name, no `GM` avatar, no first-person paragraph.
- Replace the heading with: **Built by knowledge workers, for knowledge workers.**
- Follow with a depersonalized 1–2 sentence paragraph speaking from the company voice (Silver Sage Software). Suggested copy to refine: *"Conduital was built by people who manage complex creative and operational work every day. It's the system we wished existed — one place where projects, tasks, and knowledge actually work together. No subscriptions. No cloud lock-in. Yours forever."*
- The personal narrative stays on the **About page** (covered by CMO-2). This change is home-page-only.
- Reasoning: the user's call as CMO is to lead with the product and its philosophy on the home page, and reserve the founder story for the About page where visitors are explicitly looking for it.

---

## P2 — Strategic. Plan now, ship over v1 roadmap.

### CRO-9. Demo video on the hero (30–60 sec, captioned)
- Loom or screen-recorded walkthrough. Replaces or complements the static hero screenshot. Highest-leverage content asset on a marketing site.

### CRO-10. Comparison landing pages (SEO + conversion)
- `/vs/notion-templates`, `/vs/sunsama`, `/vs/reclaim`, `/vs/obsidian`. Each: head-to-head table + one-paragraph "when to choose Conduital." Captures bottom-funnel search.

### CRO-11. Use-case landing pages
- `/for/freelancers`, `/for/solopreneurs`, `/for/researchers`. Same chassis as home page, swapped hero + screenshots + testimonial selection.

### CRO-12. Exit-intent email capture
- Single overlay on first exit-intent only. Offer: a short PDF (e.g., "The Weekly Review That Doesn't Die"). Reuses existing ConvertKit pipe.

### CMO-6. Blog content velocity
- Currently 2 posts. Target 1/week minimum, mix of (a) productivity philosophy, (b) Conduital tutorial, (c) customer story.
- Add tag/topic taxonomy to `src/content.config.ts` so posts surface by category.

### CMO-7. Article-level JSON-LD + per-post OG images
- Blog posts currently have no `Article` schema and share the site OG image.

### CMO-8. Brand system pass
- The site uses ad-hoc colors and font sizes per page. Codify in `global.css` (or a tokens file) and remove inline `style=` blocks (e.g., the bottom-CTA buttons in `about.astro` and `faq.astro` are styled inline and drift from the home page).

### CMO-9. Accessibility audit
- Run axe/Lighthouse on every page. Known smells: comparison slider has no keyboard control; lightbox has no focus trap; momentum demo has no announcements for screen readers.

### Customer-Care-3. Bug/feedback intake
- Add a "Report a bug" link in the footer + on the Download page. Either a Tally form or a `mailto:` with subject template. Today the only path is `greg@conduital.com` buried in the FAQ.

### Customer-Care-4. Community link
- If a Discord/Circle/forum exists or is planned, link it. Existing customers ask each other questions before they email.

---

## v1 Roadmap (8 weeks, two-week cadence)

### Sprint 1 (Weeks 1–2): "Stop the bleeding"
**Goal:** Fix conversion-killers and contradictions.
- CRO-1 (product-identity rewrite across pages + schema)
- CRO-2 (visible pricing)
- CRO-3 (footer fixes)
- CRO-4 (risk-reducer copy)
- CMO-1 (correct schema + OG)
- Customer-Care-1 (changelog page, even if minimal)

**Definition of done:** A first-time visitor on mobile and desktop can correctly answer "what is this, what does it cost, can I get my money back?" within 10 seconds.

### Sprint 2 (Weeks 3–4): "Build trust"
**Goal:** Add social proof and structure the conversion funnel.
- CRO-5 (1+ real testimonial; Product Hunt or counter if available)
- CRO-6 (How It Works 3-step)
- CRO-7 (Who it's for / not for)
- CRO-8 (analytics events on every CTA)
- CMO-2 (real creator photo)
- CMO-3 (hero tightening)

**Definition of done:** We can measure CTA-click → Gumroad conversion rate. Page has at least one human face and one human quote.

### Sprint 3 (Weeks 5–6): "Polish and prove"
**Goal:** Visual quality, mobile QA, customer-facing content.
- CMO-4 (real chaos mockup)
- CMO-5 (mobile QA pass)
- CMO-8 (brand system / token consolidation)
- Customer-Care-2 (`/docs` stub + Getting Started)
- CMO-6 (start weekly blog cadence)

**Definition of done:** Lighthouse ≥ 90 on Performance, Accessibility, Best Practices, SEO across home, FAQ, About, Download, Blog index. No inline `style=` blocks left in page templates.

### Sprint 4 (Weeks 7–8): "Grow the funnel"
**Goal:** Open new acquisition channels.
- CRO-9 (demo video on hero)
- CRO-10 (one comparison page — start with `/vs/notion-templates`)
- CRO-11 (one use-case page — start with `/for/solopreneurs`)
- CRO-12 (exit-intent capture)
- CMO-7 (Article schema + per-post OG)

**Definition of done:** Two new SEO landing pages indexed, demo video live above the fold, exit-intent measurably capturing emails.

---

## Out of scope for v1 (parking lot)

- Localization / i18n
- Affiliate program landing
- Customer login portal / license-key self-serve (handled by Gumroad today)
- Mac version marketing (FAQ promises Q3 2026 — revisit when product is closer)
- Full design-system component library

---

## How to use this file

- **Adding a new item:** append to the right priority section with a `CRO-N`, `CMO-N`, or `Customer-Care-N` ID. Keep one-liners; details belong in `findings.md` or task-specific docs.
- **Promoting/demoting:** move the line, don't rewrite the ID — IDs are stable references for `next-prompt.md` and progress logs.
- **Closing:** strike-through the line and append `→ shipped YYYY-MM-DD (commit/PR ref)`. Don't delete — backlog history is signal.
- **`next-prompt.md` writes:** at session end, pick 1–3 unshipped items by priority and bake their IDs + acceptance criteria into the next-session prompt.
