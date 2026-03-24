#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3000}"
EMAIL="${EMAIL:-smoke.$(date +%s)@example.com}"
PASSWORD="${PASSWORD:-password123!}"

# Refresh cookie name depends on scheme (see backend-api/routes/users.js)
REFRESH_COOKIE_NAME="rt"
if [[ "$API_URL" == https://* ]]; then
  REFRESH_COOKIE_NAME="__Host-rt"
fi

tmp_dir="$(mktemp -d)"
cookie_jar="$tmp_dir/cookies.txt"
hdr_login="$tmp_dir/login.headers.txt"
hdr_logout="$tmp_dir/logout.headers.txt"

cleanup() { rm -rf "$tmp_dir"; }
trap cleanup EXIT

rand_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    # best-effort fallback
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  fi
}

csrf_seed="$(rand_hex)"

echo "==> API_URL=$API_URL"
echo "==> Using EMAIL=$EMAIL"

echo "==> 1) Register (seeds csrf cookie)"
curl -sS \
  -c "$cookie_jar" \
  -D /dev/stderr \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $csrf_seed" \
  -X POST \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"firstName\":\"Smoke\",\"lastName\":\"Test\",\"company\":\"TestCo\"}" \
  "$API_URL/api/users/register" >/dev/null

echo "==> 2) Login (expects refresh + csrf cookies)"
curl -sS \
  -b "$cookie_jar" -c "$cookie_jar" \
  -D "$hdr_login" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $csrf_seed" \
  -X POST \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  "$API_URL/api/users/login" >/dev/null

if ! rg -i --quiet '^set-cookie: __Host-rt=' "$hdr_login"; then
  if ! rg -i --quiet "^set-cookie: ${REFRESH_COOKIE_NAME}=" "$hdr_login"; then
    echo "FAIL: login did not set ${REFRESH_COOKIE_NAME} cookie" >&2
    exit 1
  fi
else
  # ok
  true
fi

csrf_cookie="$(
  # Netscape cookie jar format: domain  flag  path  secure  expiration  name  value
  awk '$6=="csrf"{print $7}' "$cookie_jar" | tail -n 1
)"
if [[ -z "${csrf_cookie:-}" ]]; then
  echo "FAIL: could not read csrf cookie from cookie jar" >&2
  exit 1
fi

echo "==> 3) CSRF required on POST (refresh without header should 403)"
code="$(
  curl -sS -o /dev/null \
    -w "%{http_code}" \
    -b "$cookie_jar" -c "$cookie_jar" \
    -X POST \
    "$API_URL/api/users/refresh"
)"
if [[ "$code" != "403" ]]; then
  echo "FAIL: expected 403 from refresh without CSRF header, got $code" >&2
  exit 1
fi

echo "==> 4) Refresh returns accessToken (with CSRF header)"
resp="$(
  curl -sS \
    -b "$cookie_jar" -c "$cookie_jar" \
    -H "X-CSRF-Token: $csrf_cookie" \
    -X POST \
    "$API_URL/api/users/refresh"
)"
if ! echo "$resp" | rg --quiet '"accessToken"\s*:'; then
  echo "FAIL: refresh did not return accessToken. Response: $resp" >&2
  exit 1
fi

echo "==> 5) Logout clears refresh cookie (204 + Set-Cookie ${REFRESH_COOKIE_NAME}=...; Max-Age=0/Expires)"
code="$(
  curl -sS -o /dev/null \
    -w "%{http_code}" \
    -b "$cookie_jar" -c "$cookie_jar" \
    -D "$hdr_logout" \
    -H "X-CSRF-Token: $csrf_cookie" \
    -X POST \
    "$API_URL/api/users/logout"
)"
if [[ "$code" != "204" ]]; then
  echo "FAIL: expected 204 from logout, got $code" >&2
  exit 1
fi
if ! rg -i --quiet "^set-cookie: ${REFRESH_COOKIE_NAME}=" "$hdr_logout"; then
  echo "FAIL: logout did not clear ${REFRESH_COOKIE_NAME} cookie (missing Set-Cookie)" >&2
  exit 1
fi
if ! rg -i --quiet "^set-cookie: ${REFRESH_COOKIE_NAME}=.*(max-age=0|expires=)" "$hdr_logout"; then
  echo "FAIL: logout Set-Cookie for ${REFRESH_COOKIE_NAME} did not look expired" >&2
  exit 1
fi

echo "OK: auth smoke test passed"

