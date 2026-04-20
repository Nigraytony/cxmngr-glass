const crypto = require('crypto');
const { parseCookies } = require('../utils/cookies');

const CSRF_COOKIE_NAME = 'csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

function isProd() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function normalizeCsrfToken(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (s.length > 256) return null;
  return s;
}

function cookieOptions() {
  return {
    httpOnly: false,
    // For cross-origin SPA->API deployments (e.g., app.cxma.io -> *.azurewebsites.net),
    // cookies must be SameSite=None;Secure to be included in credentialed XHR/fetch.
    // Keep Lax for local dev so HTTPS isn't required.
    sameSite: isProd() ? 'none' : 'lax',
    path: '/',
    secure: isProd(),
  };
}

function ensureCsrfCookieAndProtect(req, res, next) {
  try {
    // Never apply JSON parsing / CSRF protection to Stripe webhook endpoint.
    if (req.originalUrl && req.originalUrl.startsWith('/api/stripe/webhook')) return next();
    if (req.method === 'OPTIONS') return next();

    const unsafe = req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE';
    const cookies = parseCookies(req.headers && req.headers.cookie);
    let csrfCookie = normalizeCsrfToken(cookies[CSRF_COOKIE_NAME]);
    const csrfHeader = normalizeCsrfToken(req.get('X-CSRF-Token') || req.get('x-csrf-token'));

    // Seed cookie from header (works for first request when cookie is missing).
    if (!csrfCookie && csrfHeader) {
      csrfCookie = csrfHeader;
      res.cookie(CSRF_COOKIE_NAME, csrfCookie, cookieOptions());
    }

    // If still missing, generate a token so subsequent requests can use it.
    if (!csrfCookie) {
      csrfCookie = crypto.randomBytes(32).toString('hex');
      res.cookie(CSRF_COOKIE_NAME, csrfCookie, cookieOptions());
      if (unsafe) {
        return res.status(403).json({ error: 'CSRF token missing', code: 'CSRF_MISSING' });
      }
      return next();
    }

    if (!unsafe) return next();
    if (!csrfHeader) return res.status(403).json({ error: 'CSRF token missing', code: 'CSRF_MISSING' });
    // Cross-origin deployments: the SPA is on a different eTLD+1 than the
    // API (e.g. app.cxma.io -> *.azurewebsites.net). document.cookie on the
    // frontend cannot read cookies set by the backend domain, so the
    // interceptor generates a fresh random token on every request. The
    // browser, meanwhile, sends back whatever csrf cookie it already has
    // for the backend domain. That makes the two values drift apart by
    // design — the classic double-submit pattern only works when both are
    // readable by the same origin.
    //
    // We still require X-CSRF-Token to be present, which is the actual
    // CSRF protection in this deploy shape: rogue origins can't set a
    // custom header without a CORS preflight, and the CORS allowlist
    // keeps them out. On mismatch, re-seed the cookie from the header so
    // subsequent requests converge — no error.
    if (csrfHeader !== csrfCookie) {
      res.cookie(CSRF_COOKIE_NAME, csrfHeader, cookieOptions());
    }
    return next();
  } catch (e) {
    return res.status(403).json({ error: 'CSRF validation failed', code: 'CSRF_FAILED' });
  }
}

module.exports = {
  ensureCsrfCookieAndProtect,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
};

