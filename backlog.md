# Conduital Site — Backlog & v1 Roadmap

**Owners:** Acting CRO + acting CMO/Design
**Date:** 2026-05-05
**Inputs:** live audit of conduital.com, source review of `src/`, FAQ/About/Download/Footer, Gumroad listing, schema/SEO metadata.
**Purpose:** This file is the source-of-truth for site improvements. `next-prompt.md` writes pull from here going forward.

---

## Canonical Product Decisions (reconciled 2026-08-02)

- **Product:** Conduital is a local-first Windows 10/11 desktop application, not a Notion template or web/mobile SaaS.
- **Data:** Projects, tasks, and notes remain in standard markdown files on the user's machine. Optional Dropbox/iCloud/Git sync is user-controlled; Conduital does not upload the user's workspace.
- **AI:** Optional, using the customer's own OpenAI-compatible API key. Core workflows work offline.
- **Pricing:** Free ($0), GTD ($49 one-time), and GTD+ ($79 one-time), with no subscription and lifetime updates within the purchased tier.
- **Approved risk-reducer:** “One-time purchase · No subscription · Free lifetime updates within your tier.” Do not promise a refund period until the actual seller policy is confirmed.
- **Mac:** A Q3 2026 target was previously published. Revalidate the schedule before repeating it; do not claim a Mac version is available.
- **Architecture:** Astro/Vercel marketing site; Kit/ConvertKit tag-based email signup through a serverless proxy; Stripe→Resend stateless fulfillment with no site database.
- **Unresolved product/operational decisions:** Gumroad refund setting; tier-specific deep-link support; final OG artwork; official public contact aliases; exact legal/company naming (`Silver Sage Software, LLC` vs `Silver Sage, LLC`); Mac schedule.

---

## TL;DR — Top Findings

1. **The download page publishes the wrong installer SHA-256.** The page advertises `833c0fc7…`, while the hosted 1.4.1 executable hashes to `A0B7461B…`. File-size copy is also inaccurate. Fix this release-integrity defect before acquisition work.
2. **Product identity still contradicts itself across pages.** The hero says "Notion-based operating system," the FAQ and newer blog posts describe local-first markdown, the Download page ships Windows software, `llms.txt` calls it a Notion template, and JSON-LD claims Web/iOS/Android with `price: 0`.
3. **No price appears on the marketing site.** Every CTA punts to Gumroad. Visitors cannot see the Free/GTD/GTD+ choice, cost, or approved risk-reducer without leaving.
4. **Visible defects remain:** footer email and Twitter placeholders, a corrupt six-byte `favicon.svg`, dead `/features` and `/pricing` blog links, and a Product Hunt banner that still says “today.”
5. **Social proof is limited.** A Product Hunt badge/embed now exists, but the site still has no real testimonial, creator photo, customer count, or outcome story. The demos remain stronger than the surrounding proof.

---

## P0 — Conversion-blocking. Fix this week.

### BUG-1. Repair installer integrity metadata
- Update the Download page to the actual `ConduitalSetup-1.4.1.exe` SHA-256: `A0B7461BA4F75BD0F755D4A6BE334C6FC3CD7E262B9463602ED18725F7AEF641`.
- Correct the displayed size (28,778,231 bytes; choose and label decimal MB or binary MiB consistently).
- Add a release check/script so version, size, and checksum are derived from the hosted artifact instead of copied by hand.
- Rebuild and verify `/download/latest` still resolves to the same artifact before deployment.

### SEC-1. Investigate and revoke the secret-like literal in ignored worktree settings
- A local ignored `.claude/worktrees/*/.claude/settings.local.json` contains a literal secret-like command argument. Do not copy it into tickets, commits, or logs.
- Determine what credential it is, revoke/rotate it if it may still be valid, then sanitize the local file. Confirm no tracked history contains the value.

### BUG-2. Replace the corrupt SVG favicon
- `public/favicon.svg` is a six-byte binary fragment, not valid SVG, while `BaseHead.astro` advertises it as `image/svg+xml`.
- Replace it with a valid branded SVG and verify favicon rendering plus fallback `.ico` behavior.

### BUG-3. Fix confirmed dead internal links
- `why-solopreneurs-leaving-subscription-productivity-apps-2026.md` links to nonexistent `/features` and `/pricing` routes.
- Point to real sections/routes or ship the routes intentionally; add an internal-link check to CI.

### BUG-4. Retire time-sensitive Product Hunt launch copy
- Replace or remove “We're live on Product Hunt today!” while preserving the evergreen badge/embed if still useful.

### SEC-2. Begin staged DMARC deployment
- Create and verify a reporting route such as `dmarc-reports@conduital.com`.
- Publish `_dmarc.conduital.com` initially as `v=DMARC1; p=none; rua=mailto:dmarc-reports@conduital.com`.
- Monitor a meaningful sending cycle (recommended 2–4 weeks), verify the known Resend stream remains aligned, then move deliberately to `quarantine` and `reject`.
- Leave Cloudflare's provider-prescribed root SPF record unchanged unless the mail inventory/provider guidance changes.

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

### SEC-3. Publish a security contact and disclosure policy
- Add RFC 9116 `public/.well-known/security.txt` and a concise policy with contact, scope, safe-testing boundaries, required reproducible evidence, and a statement that no bounty is promised unless agreed in writing.
- Do not contact or pay the prior unsolicited reporter as part of this item.

### REL-1. Decide and implement Windows installer signing
- The hosted 1.4.1 executable has valid embedded version metadata but is not Authenticode-signed.
- Evaluate an appropriate code-signing path, timestamp releases, and document verification/release ownership.

### BUG-5. Reconcile public company and contact identity
- Resolve `Silver Sage Software, LLC` vs `Silver Sage, LLC` copy.
- Decide whether public general/support aliases are `info@conduital.com` and `support@conduital.com`; an unmerged historical commit intentionally selected those over `greg@conduital.com`.
- Update Footer, FAQ, disclosure policy, and mail-routing inventory together after the aliases are verified.

### TECH-1. Make build/test documentation truthful and portable
- `.env.example` incorrectly says a missing Stripe secret permits unverified production processing; current code fails closed.
- `npm test` uses `node --test test/`, which fails on the current Windows/Node 24 environment. Use an explicit portable test-file pattern.
- Replace the mostly-stock Astro README with current architecture, release, test, and operational guidance.
- Run webhook tests in CI, not only the Astro build.

### CRO-5. Add social proof above the fold (or just below it)
- Even one real testimonial with a face and a job title outperforms zero. If we don't have any yet, run a 1-week ask to early users via the existing email list.
- Sub-elements once available: testimonial carousel, "Used by N knowledge workers" counter (only if true), Product Hunt badge, screenshot callouts of customer Notion/file workspaces.
- **Current evidence:** Product Hunt banner/badge/embed shipped 2026-05-12; testimonial and human/customer proof remain open.

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

### ~~CMO-10. Depersonalize the home-page "Built by" section~~ → shipped 2026-08-21
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
- Currently 5 posts (2 March, 3 June). Target 1/week minimum, mix of (a) productivity philosophy, (b) Conduital tutorial, (c) customer story.
- Add tag/topic taxonomy to `src/content.config.ts` so posts surface by category.

### CMO-7. Article-level JSON-LD + per-post OG images
- Blog posts currently have no `Article` schema and share the site OG image.

### CMO-8. Brand system pass
- The site uses ad-hoc colors and font sizes per page. Codify in `global.css` (or a tokens file) and remove inline `style=` blocks (e.g., the bottom-CTA buttons in `about.astro` and `faq.astro` are styled inline and drift from the home page).

### CMO-9. Accessibility audit
- Run axe/Lighthouse on every page. Known smells: comparison slider has no keyboard control; lightbox has no focus trap; momentum demo has no announcements for screen readers.

### TECH-2. Add fulfillment failure recovery
- Resend failures are acknowledged to Stripe with HTTP 200 to prevent duplicate key generation, but there is no durable retry/recovery path for a buyer who never receives the key.
- Design idempotent fulfillment/recovery before changing retry behavior; never log or expose license keys casually.

### TECH-3. Harden Stripe tier mapping contracts
- Unknown or missing Stripe price metadata currently defaults to the GTD paid tier.
- Validate configured price IDs/metadata explicitly and fail safely when the product catalog drifts.

### TECH-4. Harden the public email-subscribe endpoint
- Improve body and email validation, request-size handling, abuse/rate controls, and bot mitigation while keeping the Kit secret server-side.

### TECH-5. Consolidate assets and release metadata
- Dashboard and Projects images are duplicated byte-for-byte in `public` and `src/assets`.
- Generate download version/size/checksum metadata from one artifact manifest and decide which asset path is canonical.

### Customer-Care-3. Bug/feedback intake
- Add a "Report a bug" link in the footer + on the Download page. Either a Tally form or a `mailto:` with subject template. Today the only path is `greg@conduital.com` buried in the FAQ.

### Customer-Care-4. Community link
- If a Discord/Circle/forum exists or is planned, link it. Existing customers ask each other questions before they email.

---

## v1 Roadmap (8 weeks, two-week cadence)

### Sprint 0 (Immediate): "Restore trust and integrity"
**Goal:** Remove release/security defects before driving more traffic.
- BUG-1 (installer checksum/size + automated verification)
- SEC-1 (secret investigation/rotation)
- BUG-2 (valid favicon)
- BUG-3 (dead internal links)
- BUG-4 (stale launch copy)
- SEC-2 (DMARC monitoring route and `p=none` publication)
- SEC-3 (security.txt + disclosure policy)
- TECH-1 (at least env/test/CI truthfulness fixes)

**Definition of done:** The hosted installer matches its published checksum, no known literal credential remains active in local worktree settings, the site has no confirmed dead internal links or corrupt advertised assets, webhook tests run in CI, and DMARC monitoring/security reporting routes are live.

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

- **Adding a new item:** append to the right priority section with a stable `CRO-N`, `CMO-N`, `Customer-Care-N`, `BUG-N`, `SEC-N`, `REL-N`, or `TECH-N` ID. Keep the summary concise; evidence/details belong in active planning findings or task-specific docs.
- **Promoting/demoting:** move the line, don't rewrite the ID — IDs are stable references for `next-prompt.md` and progress logs.
- **Closing:** strike-through the line and append `→ shipped YYYY-MM-DD (commit/PR ref)`. Don't delete — backlog history is signal.
- **`next-prompt.md` writes:** at session end, pick 1–3 unshipped items by priority and bake their IDs + acceptance criteria into the next-session prompt.
