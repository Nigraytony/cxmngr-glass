# Vue Liquid Glass Dashboard Starter

A tiny Vue 3 + Vite + Tailwind starter with a **liquid glass** look, a **dashboard layout** (collapsible sidebar + topbar), and basic **auth pages** (login/register) with **route guards** powered by Pinia.

## Tech

- Vue 3 + Vite
- Tailwind CSS (+ `@tailwindcss/forms`)
- Vue Router (protected routes)
- Pinia (auth + UI state)
- Fully client-side mock auth (stored in `localStorage`)

## Quick start

```bash
npm i
npm run dev
```
 
Open the URL printed in your terminal.

## Auth

- Any non-empty email/password logs you in (or register first).
- State is stored in `localStorage` so refresh persists your session.
- Use the **Logout** button in the topbar to sign out.

## Files

- `src/layouts/DashboardLayout.vue` — topbar + collapsible glass sidebar
- `src/pages/auth/*` — Login / Register forms
- `src/pages/dashboard/DashboardHome.vue` — example cards
- `src/components/LiquidGlassCard.vue` — glass card
- `src/stores/auth.js` — mock auth
- `src/stores/ui.js` — sidebar toggle

Enjoy!

## Deploy to Azure Static Web Apps

This repo is pre-wired to deploy as a static site using Azure Static Web Apps (ASWA).

What you’ll need:

- An Azure subscription
- This repo on GitHub (default branch: `main`)

Setup steps:

1. Create a Static Web App in the Azure Portal
   - Build preset: Custom
   - App location: `/`
   - Output location: `dist`
   - API location: (leave empty unless you add Azure Functions)
   - When prompted, let Azure create a GitHub Action, or use the provided workflow in `.github/workflows/azure-static-web-apps.yml`.
2. Add the deployment token to your repo secrets
   - In the Azure Portal, open your Static Web App → Manage deployment token
   - In GitHub → Settings → Secrets → Actions, add `AZURE_STATIC_WEB_APPS_API_TOKEN` with that value
3. Configure your API base URL
   - Copy `.env.production.example` to `.env.production` and set `VITE_API_BASE` to your backend URL
   - Ensure your API allows CORS from your ASWA domain (including the auto-generated preview domains)
4. Push to `main`
   - The GitHub Action will build and deploy `dist` automatically

Client-side routing

- `staticwebapp.config.json` is included to rewrite unknown routes to `/index.html`, so Vue Router history mode works across refreshes and deep links.

Backend/API notes

- All HTTP calls go through `src/utils/http.ts`, which reads `VITE_API_BASE` from env.
- Default is `http://localhost:4242`; override in production via `.env.production`.
- Make sure your API implements CORS for the ASWA domain(s).
