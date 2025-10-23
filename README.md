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
