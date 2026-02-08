const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TTL || '15m';

function requireJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    const err = new Error('JWT_SECRET is not set');
    err.code = 'JWT_SECRET_MISSING';
    throw err;
  }
  return jwtSecret;
}

function signAccessToken({ userId, tokenVersion = 0 }) {
  const jwtSecret = requireJwtSecret();
  return jwt.sign({ _id: String(userId), tv: Number(tokenVersion) || 0 }, jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });
}

module.exports = {
  ACCESS_TOKEN_TTL,
  signAccessToken,
};
