const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_TTL || '30d';
// Offline grant: a longer-lived credential issued at project checkout (offline
// Phase 1, decision D1). Redeemable while online for a fresh access token, so a
// device whose access token expired while offline can re-authenticate and check
// in without a full re-login. Bound to user + project + device + a server-side
// grant id (for revocation on check-in).
const OFFLINE_GRANT_TTL_DAYS = Number(process.env.OFFLINE_GRANT_TTL_DAYS || 14);

function requireAccessSecret() {
  const s = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!s) {
    const err = new Error('JWT_ACCESS_SECRET is not set');
    err.code = 'JWT_ACCESS_SECRET_MISSING';
    throw err;
  }
  return s;
}

function requireRefreshSecret() {
  const s = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!s) {
    const err = new Error('JWT_REFRESH_SECRET is not set');
    err.code = 'JWT_REFRESH_SECRET_MISSING';
    throw err;
  }
  return s;
}

function signAccessToken({ userId, tokenVersion = 0 }) {
  const secret = requireAccessSecret();
  return jwt.sign({ _id: String(userId), tv: Number(tokenVersion) || 0 }, secret, { expiresIn: ACCESS_TOKEN_TTL });
}

function verifyAccessToken(token) {
  const secret = requireAccessSecret();
  return jwt.verify(token, secret);
}

function signRefreshToken({ userId, refreshId }) {
  const secret = requireRefreshSecret();
  return jwt.sign({ sub: String(userId), rid: String(refreshId) }, secret, { expiresIn: REFRESH_TOKEN_TTL });
}

function verifyRefreshToken(token) {
  const secret = requireRefreshSecret();
  return jwt.verify(token, secret);
}

function requireOfflineSecret() {
  const s = process.env.JWT_OFFLINE_SECRET || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!s) {
    const err = new Error('JWT secret is not set for offline grants');
    err.code = 'JWT_OFFLINE_SECRET_MISSING';
    throw err;
  }
  return s;
}

function signOfflineGrant({ userId, projectId, deviceId, grantId, tokenVersion = 0 }) {
  const secret = requireOfflineSecret();
  return jwt.sign(
    {
      sub: String(userId),
      pid: String(projectId),
      did: String(deviceId),
      jti: String(grantId),
      tv: Number(tokenVersion) || 0,
      typ: 'offline_grant',
    },
    secret,
    { expiresIn: `${OFFLINE_GRANT_TTL_DAYS}d` }
  );
}

function verifyOfflineGrant(token) {
  const secret = requireOfflineSecret();
  const decoded = jwt.verify(token, secret);
  if (!decoded || decoded.typ !== 'offline_grant') {
    const err = new Error('Not an offline grant');
    err.code = 'INVALID_GRANT_TYPE';
    throw err;
  }
  return decoded;
}

module.exports = {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  OFFLINE_GRANT_TTL_DAYS,
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signOfflineGrant,
  verifyOfflineGrant,
};
