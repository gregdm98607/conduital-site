# Astro Starter Kit: Blog

```sh
npm create astro@latest -- --template blog
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and Open Graph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── src/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |
| `npm test`                | Run unit tests for the serverless function(s)    |

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## 💳 Fulfillment function (Stripe → Resend)

Beside the static site, Vercel auto-deploys serverless functions from the `api/`
directory. `api/stripe-webhook.js` handles Conduital purchase fulfillment
(MON-013): it verifies the Stripe webhook signature, generates a license key, and
emails it to the buyer via Resend. It is **stateless** — the desktop app activates
Stripe keys offline, so no database is involved.

- **Endpoint:** `POST https://conduital.com/api/stripe-webhook`
- **Env vars:** see [`.env.example`](.env.example) (set them in Vercel → Project
  Settings → Environment Variables; for local testing copy to `.env` and use `vercel dev`).
- **Tests:** `npm test` (zero deps; pure helpers + stubbed `fetch`).
- **Deploy/DNS/Stripe/Resend setup:** see the runbook in the app repo,
  `conduital/docs/MON-013-fulfillment-runbook.md`.

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
