#!/usr/bin/env bash
# Backend startup wrapper.
#
# Server-side PDF rendering (final report + Office preview) launches Chromium via
# @sparticuz/chromium. Azure App Service's Linux "Blessed" Node image does NOT ship
# the shared libraries Chromium needs (libnss3, libgbm1, …), and they are ephemeral
# (lost when the container recycles), so install them on every start — best-effort.
#
# This is a no-op on hosts that already have the libs (local dev) or lack apt
# (macOS/Windows): the server always starts regardless, so non-PDF features work
# even if the install fails.

set +e
if command -v apt-get >/dev/null 2>&1 && ! ldconfig -p 2>/dev/null | grep -q "libnss3.so"; then
  echo "[startup] Installing Chromium runtime libraries…"
  apt-get update -y >/dev/null 2>&1 \
    && apt-get install -y --no-install-recommends \
        libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
        libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
        libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 libxshmfence1 \
        libx11-6 libxcb1 libxext6 libxi6 fonts-liberation >/dev/null 2>&1 \
    && echo "[startup] Chromium runtime libraries installed." \
    || echo "[startup] WARNING: could not install Chromium libraries — PDF rendering may be unavailable, but the server will still start."
fi
set -e

exec node index.js
