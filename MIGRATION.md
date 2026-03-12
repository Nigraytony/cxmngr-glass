# Migration: Secure Cookie-Based Auth

This repo now uses cookie-based refresh tokens + in-memory access tokens (no JWT in `localStorage`).

## Backend env vars

- `FRONTEND_URL` — frontend origin allowed for CORS credentials (example: `https://app.example.com`).
- `JWT_ACCESS_SECRET` — secret for signing/verifying access tokens.
- `JWT_REFRESH_SECRET` — secret for signing/verifying refresh tokens.

## Frontend env vars (Vite)

- `VITE_API_URL` — backend base URL (example: `https://api.example.com`).

## Notes

- Refresh token cookie name: `__Host-rt` (httpOnly, `path=/`, `sameSite=lax`, no `domain`; `secure` enabled in production).
- CSRF uses double-submit: backend sets a non-httpOnly `csrf` cookie; all `POST/PUT/PATCH/DELETE` require `X-CSRF-Token` matching that cookie (except `POST /api/stripe/webhook`).
- Stripe webhook uses raw body parsing and is excluded from JSON parsing + CSRF.

