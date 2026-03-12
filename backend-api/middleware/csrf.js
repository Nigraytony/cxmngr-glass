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
    sameSite: 'lax',
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
    if (csrfHeader !== csrfCookie) return res.status(403).json({ error: 'CSRF token mismatch', code: 'CSRF_MISMATCH' });
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

