# Conduital marketing site

The public Conduital site is an [Astro](https://astro.build/) project deployed on Vercel. It serves the marketing pages, blog, Windows installer, Kit/ConvertKit signup proxy, and stateless Stripe-to-Resend fulfillment webhook.

## Requirements

- Node.js 22.12 or newer
- npm

Install dependencies and start the local site:

```sh
npm ci
npm run dev
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Astro locally at `http://localhost:4321`. |
| `npm test` | Run the Stripe webhook tests with Node's portable explicit test-file path. |
| `npm run verify:release` | Recompute installer metadata and confirm the committed manifest and redirects match. |
| `npm run release:manifest` | Regenerate the release manifest from the installer selected by `/download/latest`. |
| `npm run build` | Verify release metadata and build the production site into `dist/`. |
| `npm run check:links` | Validate internal routes and fragments in the built site. Run after a build. |
| `npm run preview` | Preview the production build locally. |

CI runs the webhook tests, production build, release verification (through `prebuild`), and the post-build internal-link check on pushes and pull requests targeting `main`.

## Architecture

- `src/pages/` contains Astro routes.
- `src/content/blog/` contains blog posts.
- `src/data/release-manifest.json` is generated release metadata rendered by the Download page.
- `public/downloads/` contains the installer selected by Vercel redirects.
- `api/subscribe.js` proxies email signup to Kit/ConvertKit while keeping its secret server-side.
- `api/stripe-webhook.js` verifies Stripe signatures and sends fulfillment email through Resend. It is stateless; the site has no license database.
- `vercel.json` owns `/download/latest` and versioned installer redirects.

## Installer release integrity

The `/download/latest` redirect is the release selector. `scripts/release-metadata.mjs` resolves that redirect, derives the semantic version from the installer filename, and calculates byte size, decimal MB, and SHA-256 from the tracked executable. The generated manifest is committed so an unexpected artifact or redirect change fails `npm run build`.

For a new Windows release:

1. Add the installer to `public/downloads/` using `ConduitalSetup-x.y.z.exe`.
2. Point `/download/latest` and `/download/vx.y.z` in `vercel.json` to that same file.
3. Run `npm run release:manifest` and review the manifest diff.
4. Run `npm test`, `npm run build`, and `npm run check:links` before requesting deployment.

## Environment and fulfillment

Copy `.env.example` to `.env` or `.env.local` for local Vercel development; never commit real values. `STRIPE_WEBHOOK_SECRET` is required for fulfillment. If it is missing, the webhook fails closed without generating a key or sending email. `RESEND_API_KEY` is required to deliver the fulfillment email. See `.env.example` for the complete variable list.

Production environment changes, deployment, DNS, Stripe, Resend, Kit, and credential rotation are operational actions and should be reviewed explicitly before execution. The detailed fulfillment runbook lives in the Conduital application repository at `conduital/docs/MON-013-fulfillment-runbook.md`.

## Attribution

The original Astro theme is based on [Bear Blog](https://github.com/HermanMartinus/bearblog/).
