function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return out;

  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const rawName = part.slice(0, idx).trim();
    if (!rawName) continue;
    const rawVal = part.slice(idx + 1).trim();
    try {
      out[rawName] = decodeURIComponent(rawVal);
    } catch (_) {
      out[rawName] = rawVal;
    }
  }
  return out;
}

module.exports = {
  parseCookies,
};

