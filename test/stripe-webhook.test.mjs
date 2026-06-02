/**
 * Unit tests for the Stripe→Resend fulfillment function (MON-013).
 * Run: `npm test`  (→ `node --test test/`)
 *
 * Lives OUTSIDE /api on purpose: every file under /api is deployed by Vercel as a
 * public endpoint, so tests must not live there.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import {
  STRIPE_WEBHOOK_KEY_RE,
  verifyStripeSignature,
  generateLicenseKey,
  tierForPriceId,
  resolveTier,
  tierLabel,
  extractBuyerEmail,
  buildFulfillmentEmail,
  sendFulfillmentEmail,
  handleCheckoutCompleted,
  readEnv,
} from '../api/stripe-webhook.js';

const SECRET = 'whsec_test_secret';

function sign(secret, ts, body) {
  return crypto.createHmac('sha256', secret).update(`${ts}.` + body, 'utf8').digest('hex');
}

// --- signature verification ---

test('verifyStripeSignature: accepts a valid signature within the window', () => {
  const ts = 1_000_000;
  const body = '{"hello":"world"}';
  const header = `t=${ts},v1=${sign(SECRET, ts, body)}`;
  assert.equal(verifyStripeSignature(body, header, SECRET, ts), true);
});

test('verifyStripeSignature: rejects a tampered signature', () => {
  const ts = 1_000_000;
  const body = '{"hello":"world"}';
  const header = `t=${ts},v1=${'0'.repeat(64)}`;
  assert.equal(verifyStripeSignature(body, header, SECRET, ts), false);
});

test('verifyStripeSignature: rejects a tampered body', () => {
  const ts = 1_000_000;
  const header = `t=${ts},v1=${sign(SECRET, ts, '{"a":1}')}`;
  assert.equal(verifyStripeSignature('{"a":2}', header, SECRET, ts), false);
});

test('verifyStripeSignature: rejects an out-of-tolerance timestamp (replay)', () => {
  const ts = 1_000_000;
  const body = '{"hello":"world"}';
  const header = `t=${ts},v1=${sign(SECRET, ts, body)}`;
  // now is 400s after the signed ts → beyond the 300s window
  assert.equal(verifyStripeSignature(body, header, SECRET, ts + 400), false);
});

test('verifyStripeSignature: accepts when one of several v1 sigs matches', () => {
  const ts = 1_000_000;
  const body = '{"hello":"world"}';
  const header = `t=${ts},v1=${'0'.repeat(64)},v1=${sign(SECRET, ts, body)}`;
  assert.equal(verifyStripeSignature(body, header, SECRET, ts), true);
});

test('verifyStripeSignature: rejects missing v1 / missing header / missing secret', () => {
  const ts = 1_000_000;
  const body = '{}';
  assert.equal(verifyStripeSignature(body, `t=${ts}`, SECRET, ts), false);
  assert.equal(verifyStripeSignature(body, '', SECRET, ts), false);
  assert.equal(verifyStripeSignature(body, `t=${ts},v1=abc`, '', ts), false);
});

// --- key generation / contract with the app ---

test('generateLicenseKey: matches the app activation regex (8×8 hex, uppercase)', () => {
  for (let i = 0; i < 200; i++) {
    const key = generateLicenseKey();
    assert.match(key, STRIPE_WEBHOOK_KEY_RE, `key failed contract: ${key}`);
    assert.equal(key, key.toUpperCase());
    assert.equal(key.length, 71); // 64 hex + 7 dashes
  }
});

test('generateLicenseKey: deterministic with an injected RNG', () => {
  const key = generateLicenseKey(() => Buffer.alloc(32, 0xab));
  assert.equal(key, 'ABABABAB-ABABABAB-ABABABAB-ABABABAB-ABABABAB-ABABABAB-ABABABAB-ABABABAB');
  assert.match(key, STRIPE_WEBHOOK_KEY_RE);
});

// --- tier resolution ---

test('tierForPriceId: maps known ids and defaults to gtd', () => {
  const env = { gtdPriceId: 'price_gtd', fullPriceId: 'price_full' };
  assert.equal(tierForPriceId('price_full', env), 'full');
  assert.equal(tierForPriceId('price_gtd', env), 'gtd');
  assert.equal(tierForPriceId('price_unknown', env), 'gtd');
  assert.equal(tierForPriceId('', env), 'gtd');
});

test('resolveTier: metadata.conduital_tier wins over price mapping', () => {
  const env = { gtdPriceId: 'price_gtd', fullPriceId: 'price_full' };
  assert.equal(resolveTier({ metadata: { conduital_tier: 'full' } }, env), 'full');
  assert.equal(resolveTier({ metadata: { price_id: 'price_full' } }, env), 'full');
  assert.equal(resolveTier({ metadata: {} }, env), 'gtd');
  assert.equal(resolveTier({}, env), 'gtd');
});

test('tierLabel: buyer-facing labels', () => {
  assert.equal(tierLabel('gtd'), 'GTD');
  assert.equal(tierLabel('full'), 'GTD+');
  assert.equal(tierLabel('weird'), 'WEIRD');
});

// --- email building ---

test('extractBuyerEmail: prefers customer_details.email, then customer_email', () => {
  assert.equal(extractBuyerEmail({ customer_details: { email: 'a@x.com' }, customer_email: 'b@x.com' }), 'a@x.com');
  assert.equal(extractBuyerEmail({ customer_email: 'b@x.com' }), 'b@x.com');
  assert.equal(extractBuyerEmail({}), '');
});

test('buildFulfillmentEmail: includes key, download url, label, default sender', () => {
  const key = 'ABABABAB-ABABABAB-ABABABAB-ABABABAB-ABABABAB-ABABABAB-ABABABAB-ABABABAB';
  const msg = buildFulfillmentEmail({ buyerEmail: 'buyer@x.com', tier: 'full', licenseKey: key, downloadUrl: '', from: '' });
  assert.equal(msg.from, 'Conduital <licenses@conduital.com>');
  assert.deepEqual(msg.to, ['buyer@x.com']);
  assert.match(msg.subject, /GTD\+/);
  assert.ok(msg.html.includes(key));
  assert.ok(msg.html.includes('https://conduital.com/download/latest'));
  assert.ok(msg.text.includes(key));
});

// --- email sending (stubbed fetch) ---

test('sendFulfillmentEmail: skips when no API key', async () => {
  let called = false;
  const res = await sendFulfillmentEmail({ to: ['x@y.com'] }, '', async () => {
    called = true;
    return { status: 200, text: async () => '' };
  });
  assert.equal(res.skipped, true);
  assert.equal(res.ok, false);
  assert.equal(called, false);
});

test('sendFulfillmentEmail: ok on 200, posts to Resend with bearer auth', async () => {
  let seen = null;
  const res = await sendFulfillmentEmail({ to: ['x@y.com'], subject: 's' }, 're_key', async (url, opts) => {
    seen = { url, opts };
    return { status: 200, text: async () => 'ok' };
  });
  assert.equal(res.ok, true);
  assert.equal(seen.url, 'https://api.resend.com/emails');
  assert.equal(seen.opts.headers.Authorization, 'Bearer re_key');
});

test('sendFulfillmentEmail: not ok on non-2xx', async () => {
  const res = await sendFulfillmentEmail({ to: ['x@y.com'] }, 're_key', async () => ({
    status: 422,
    text: async () => 'bad',
  }));
  assert.equal(res.ok, false);
  assert.equal(res.status, 422);
});

// --- end-to-end fulfillment (stubbed fetch) ---

const ENV = {
  resendApiKey: 're_key',
  downloadUrl: 'https://conduital.com/download/latest',
  from: 'Conduital <licenses@conduital.com>',
  gtdPriceId: 'price_gtd',
  fullPriceId: 'price_full',
};

test('handleCheckoutCompleted: emails a contract-valid key and reports sent', async () => {
  let sentBody = null;
  const session = { customer_details: { email: 'buyer@x.com' }, metadata: { conduital_tier: 'gtd' } };
  const result = await handleCheckoutCompleted(session, ENV, async (_url, opts) => {
    sentBody = JSON.parse(opts.body);
    return { status: 200, text: async () => 'ok' };
  });
  assert.equal(result.status, 'fulfilled');
  assert.equal(result.tier, 'gtd');
  assert.equal(result.email_sent, 'true');
  // the emailed key must satisfy the app's activation regex
  const emailedKey = sentBody.text.split('\n').find((l) => STRIPE_WEBHOOK_KEY_RE.test(l.trim()));
  assert.ok(emailedKey, 'emailed body should contain a contract-valid key');
});

test('handleCheckoutCompleted: no buyer email → no send, email_sent false', async () => {
  let called = false;
  const result = await handleCheckoutCompleted({ metadata: { conduital_tier: 'gtd' } }, ENV, async () => {
    called = true;
    return { status: 200, text: async () => 'ok' };
  });
  assert.equal(result.email_sent, 'false');
  assert.equal(called, false);
});

test('handleCheckoutCompleted: resend failure → email_sent false (no throw)', async () => {
  const session = { customer_email: 'buyer@x.com', metadata: { conduital_tier: 'full' } };
  const result = await handleCheckoutCompleted(session, ENV, async () => ({ status: 500, text: async () => 'err' }));
  assert.equal(result.tier, 'full');
  assert.equal(result.email_sent, 'false');
});

// --- env defaults ---

test('readEnv: applies stable defaults when unset', () => {
  const env = readEnv({});
  assert.equal(env.downloadUrl, 'https://conduital.com/download/latest');
  assert.equal(env.from, 'Conduital <licenses@conduital.com>');
  assert.equal(env.webhookSecret, '');
  assert.equal(env.resendApiKey, '');
});
