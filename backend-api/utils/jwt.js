const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_TTL || '30d';

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

module.exports = {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
};
