/**
 * Stripe → Resend fulfillment — Vercel serverless function (MON-013)
 *
 * WHY THIS EXISTS
 * ---------------
 * The desktop app's `backend/app/api/webhooks.py` implements the same flow, but
 * in production that backend runs only on the buyer's `127.0.0.1:52140` — Stripe
 * can never reach it. This standalone function lives beside the static Astro site
 * (auto-detected by Vercel from the `/api` directory) so Stripe CAN reach it at:
 *
 *     POST https://conduital.com/api/stripe-webhook
 *
 * It is intentionally STATELESS. The desktop app activates Stripe-issued keys
 * OFFLINE (see `backend/app/api/license.py::_activate_stripe_opaque`, MON-008):
 * an 8×8-hex key is trusted by format with no server round-trip. So this function
 * only needs to: verify the Stripe signature → generate a correctly-formatted key
 * → email it to the buyer. No database, no KV.
 *
 * CONTRACT WITH THE APP
 * ---------------------
 * The generated key MUST match the app's `_STRIPE_WEBHOOK_KEY_RE`:
 *     ^(?:[0-9A-Fa-f]{8}-){7}[0-9A-Fa-f]{8}$   (8 groups of 8 hex chars)
 * mirroring Python's `secrets.token_hex(32).upper()` grouped 8×8.
 *
 * RUNTIME: Node.js (the `node:crypto` import pins it off the Edge runtime).
 * DEPENDENCIES: none (Node 22 built-in `crypto` + global `fetch`).
 *
 * ENV (set in Vercel Project Settings → Environment Variables):
 *   STRIPE_WEBHOOK_SECRET  whsec_*  — Stripe Dashboard → Webhooks signing secret
 *   RESEND_API_KEY         re_*     — resend.com (in vault: Silver_Sage_Media → Account Information)
 *   CONDUITAL_DOWNLOAD_URL          — defaults to the stable https://conduital.com/download/latest redirect
 *   RESEND_FROM                     — defaults to "Conduital <licenses@conduital.com>"
 *   STRIPE_GTD_PRICE_ID    price_*  — optional; maps a price id → gtd tier
 *   STRIPE_FULL_PRICE_ID   price_*  — optional; maps a price id → full tier
 */

import crypto from 'node:crypto';

// Mirrors backend `_STRIPE_WEBHOOK_KEY_RE` — exported so tests can pin the contract.
export const STRIPE_WEBHOOK_KEY_RE = /^(?:[0-9A-Fa-f]{8}-){7}[0-9A-Fa-f]{8}$/;

// Replay window (seconds) — must match webhooks.py (300s = 5 min).
const REPLAY_TOLERANCE_SECONDS = 300;

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Verify a Stripe webhook signature.
 *
 * Stripe signs HMAC-SHA256 over "timestamp.payload" with the signing secret.
 * Header form: `t=<ts>,v1=<hex>[,v1=<hex>...]`. Rejects timestamps outside the
 * replay window. `nowSeconds` is injectable for deterministic tests.
 *
 * @param {string} rawBody  — the exact raw request body
 * @param {string} sigHeader — value of the `stripe-signature` header
 * @param {string} secret    — STRIPE_WEBHOOK_SECRET
 * @param {number} [nowSeconds]
 * @returns {boolean}
 */
export function verifyStripeSignature(rawBody, sigHeader, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!sigHeader || typeof sigHeader !== 'string' || !secret) return false;

  const parts = {};
  for (const part of sigHeader.split(',')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    (parts[k] ||= []).push(v);
  }

  const timestamps = parts['t'] || [];
  const signatures = parts['v1'] || [];
  if (timestamps.length === 0 || signatures.length === 0) return false;

  const ts = parseInt(timestamps[0], 10);
  if (Number.isNaN(ts)) return false;

  // Replay protection: reject if older/newer than the tolerance window.
  if (Math.abs(nowSeconds - ts) > REPLAY_TOLERANCE_SECONDS) return false;

  const signedPayload = `${ts}.` + rawBody;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  const expectedBuf = Buffer.from(expected);

  // Constant-time compare against each provided v1 signature.
  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig);
    return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
  });
}

/**
 * Generate a 32-byte (64 hex char) key formatted as 8 groups of 8, uppercase.
 * Matches Python `_generate_license_key()` and the app's activation regex.
 * `randomBytesImpl` is injectable for deterministic tests.
 *
 * @param {(n: number) => Buffer} [randomBytesImpl]
 * @returns {string}
 */
export function generateLicenseKey(randomBytesImpl = crypto.randomBytes) {
  const raw = randomBytesImpl(32).toString('hex').toUpperCase(); // 64 hex chars
  return raw.match(/.{8}/g).join('-'); // 8 × 8
}

/** Map a Stripe Price ID → Conduital tier (conservative default: gtd). */
export function tierForPriceId(priceId, { gtdPriceId = '', fullPriceId = '' } = {}) {
  if (priceId && priceId === fullPriceId) return 'full';
  if (priceId && priceId === gtdPriceId) return 'gtd';
  return 'gtd';
}

/** Resolve tier from session metadata (preferred) or price-id mapping. */
export function resolveTier(session, priceEnv = {}) {
  const metadata = (session && session.metadata) || {};
  const explicit = metadata.conduital_tier || '';
  if (explicit) return explicit;
  const priceId = metadata.price_id || '';
  return priceId ? tierForPriceId(priceId, priceEnv) : 'gtd';
}

/** Buyer-facing label for a tier (mirrors webhooks.py). */
export function tierLabel(tier) {
  return { gtd: 'GTD', full: 'GTD+' }[tier] || String(tier).toUpperCase();
}

/** Extract the buyer email from a checkout session. */
export function extractBuyerEmail(session) {
  return (
    (session && session.customer_details && session.customer_details.email) ||
    (session && session.customer_email) ||
    ''
  );
}

/**
 * Build the Resend email payload (subject/html/text). Pure — no network.
 * @returns {{from: string, to: string[], subject: string, html: string, text: string}}
 */
export function buildFulfillmentEmail({ buyerEmail, tier, licenseKey, downloadUrl, from }) {
  const label = tierLabel(tier);
  const url = downloadUrl || 'https://conduital.com/download/latest';
  const sender = from || 'Conduital <licenses@conduital.com>';
  const subject = `Your Conduital ${label} license key is ready`;

  const html = `
<p>Hi there,</p>

<p>Thank you for purchasing <strong>Conduital ${label}</strong>. Your license key is below.</p>

<p style="font-size:18px; font-family:monospace; background:#f4f4f4; padding:12px; border-radius:4px;">
  ${licenseKey}
</p>

<p>
  <a href="${url}" style="display:inline-block;background:#0070f3;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">
    Download Conduital
  </a>
</p>

<ol>
  <li>Download and install Conduital from the link above.</li>
  <li>Open <strong>Settings → License</strong>.</li>
  <li>Paste your key and click <strong>Activate</strong>.</li>
</ol>

<p>Your ${label} features will unlock immediately. Keep this email — your key is permanent.</p>

<p>Questions? Reply to this email or visit <a href="https://conduital.com">conduital.com</a>.</p>

<p>— The Conduital Team</p>
`.trim();

  const text =
    `Your Conduital ${label} license key:\n\n${licenseKey}\n\n` +
    `Download: ${url}\n\n` +
    'To activate: open Settings → License, paste your key, click Activate.\n\n' +
    'Questions? Visit conduital.com';

  return { from: sender, to: [buyerEmail], subject, html, text };
}

// ---------------------------------------------------------------------------
// Side-effectful helpers
// ---------------------------------------------------------------------------

/**
 * Send the fulfillment email via Resend. Best-effort: a failure is non-fatal
 * (we still return 200 so Stripe does NOT retry — a retry would issue a *new*
 * key). `fetchImpl` is injectable for tests.
 *
 * @returns {Promise<{ok: boolean, status?: number, skipped?: boolean, error?: boolean}>}
 */
export async function sendFulfillmentEmail(payload, apiKey, fetchImpl = fetch) {
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured — skipping fulfillment email to %s', payload?.to?.[0]);
    return { ok: false, skipped: true };
  }
  try {
    const resp = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (resp.status === 200 || resp.status === 201) {
      console.info('Fulfillment email sent to %s', payload?.to?.[0]);
      return { ok: true, status: resp.status };
    }
    let detail = '';
    try {
      detail = (await resp.text()).slice(0, 300);
    } catch {
      /* ignore */
    }
    console.error('Resend returned %d for fulfillment email: %s', resp.status, detail);
    return { ok: false, status: resp.status };
  } catch (exc) {
    console.error('Network error sending fulfillment email:', exc?.message || exc);
    return { ok: false, error: true };
  }
}

/** Read fulfillment-relevant env into a plain object (testable). */
export function readEnv(env = process.env) {
  return {
    webhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    resendApiKey: env.RESEND_API_KEY || '',
    downloadUrl: env.CONDUITAL_DOWNLOAD_URL || 'https://conduital.com/download/latest',
    from: env.RESEND_FROM || 'Conduital <licenses@conduital.com>',
    gtdPriceId: env.STRIPE_GTD_PRICE_ID || '',
    fullPriceId: env.STRIPE_FULL_PRICE_ID || '',
  };
}

/**
 * Core fulfillment for `checkout.session.completed`. Generates a key and emails
 * it. Never logs the key. `fetchImpl` injectable for tests.
 */
export async function handleCheckoutCompleted(session, env, fetchImpl = fetch) {
  const buyerEmail = extractBuyerEmail(session);
  const tier = resolveTier(session, { gtdPriceId: env.gtdPriceId, fullPriceId: env.fullPriceId });
  const licenseKey = generateLicenseKey();

  let emailSent = false;
  if (buyerEmail) {
    const payload = buildFulfillmentEmail({
      buyerEmail,
      tier,
      licenseKey,
      downloadUrl: env.downloadUrl,
      from: env.from,
    });
    const res = await sendFulfillmentEmail(payload, env.resendApiKey, fetchImpl);
    emailSent = res.ok;
  } else {
    console.warn('No buyer email in checkout.session.completed — cannot send fulfillment email');
  }

  return { status: 'fulfilled', tier, email_sent: String(emailSent) };
}

// ---------------------------------------------------------------------------
// HTTP handler (Vercel Web-standard signature)
// ---------------------------------------------------------------------------

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(request) {
  const rawBody = await request.text();
  const env = readEnv();
  const sig = request.headers.get('stripe-signature');

  // --- Signature verification ---
  if (env.webhookSecret) {
    if (!sig) {
      console.warn('Stripe webhook received with no signature header');
      return json(400, { error: 'Missing stripe-signature header' });
    }
    if (!verifyStripeSignature(rawBody, sig, env.webhookSecret)) {
      console.warn('Stripe webhook signature verification failed');
      return json(400, { error: 'Webhook signature verification failed' });
    }
  } else {
    console.warn('STRIPE_WEBHOOK_SECRET not configured — processing webhook WITHOUT verification (set it before production)');
  }

  // --- Parse event ---
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json(400, { error: 'Invalid JSON payload' });
  }

  const eventType = (event && event.type) || '';
  console.info('Received Stripe event: %s (id=%s)', eventType, (event && event.id) || '?');

  // Only checkout completion triggers fulfillment; ack everything else with 200.
  if (eventType !== 'checkout.session.completed') {
    return json(200, { status: 'ignored', event: eventType });
  }

  const session = (event && event.data && event.data.object) || {};
  const result = await handleCheckoutCompleted(session, env);
  return json(200, result);
}
