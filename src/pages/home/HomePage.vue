<template>
  <div
    class="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100"
  >
    <!-- subtle background blobs -->
    <div
      class="pointer-events-none fixed inset-0 -z-10 opacity-60 mix-blend-screen dark:opacity-40"
    >
      <div class="absolute -top-40 -left-24 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
      <div class="absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-emerald-300/40 blur-3xl" />
      <div class="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-300/20 blur-3xl" />
    </div>

    <PublicHeader />

    <main>
      <!-- HERO: dark glass band that mirrors the in-app look; real screenshot
           panel on the right. Drop the actual product screenshot at
           public/screenshots/hero-dashboard.png (16:10, ~1600x1000, optimized).
           Until then, the placeholder card behind the <img> renders gracefully. -->
      <section class="relative isolate overflow-hidden bg-slate-950 text-slate-100">
        <!-- Vivid gradient blobs — Azure-style energy on dark, matching the
             app's sidebar/app-bg gradients so signup → login feels continuous. -->
        <div class="pointer-events-none absolute inset-0 -z-10">
          <div class="absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-sky-500/30 blur-3xl" />
          <div class="absolute top-1/3 -right-32 h-[34rem] w-[34rem] rounded-full bg-emerald-500/20 blur-3xl" />
          <div class="absolute -bottom-40 left-1/3 h-[28rem] w-[28rem] rounded-full bg-violet-500/25 blur-3xl" />
          <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.08),transparent_55%)]" />
        </div>

        <div
          class="mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 pb-24 pt-16 md:flex-row md:gap-16 md:px-6 md:pb-32 md:pt-24"
        >
          <!-- Left: copy -->
          <div class="flex-1 space-y-7 text-center md:text-left">
            <!-- Eyebrow pill -->
            <span
              class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-sky-300 backdrop-blur-xl"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Commissioning · Cx Plan · Final Report
            </span>

            <!-- Headline with gradient highlight on "CxAs" both times -->
            <h1
              class="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Built by
              <span class="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">CxAs</span>,
              for
              <span class="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">CxAs</span>.
            </h1>

            <p class="text-base text-slate-300 sm:text-lg">
              The complete commissioning workflow — OPR through Final Report — without enterprise pricing or enterprise complexity. Made for sole practitioners and small firms.
            </p>

            <div
              class="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-start"
            >
              <RouterLink
                :to="{ name: 'register' }"
                class="w-full rounded-xl bg-gradient-to-tr from-sky-500 to-sky-600 px-7 py-3 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(56,189,248,0.55)] transition hover:from-sky-600 hover:to-sky-700 sm:w-auto"
              >
                Get started free
              </RouterLink>
              <RouterLink
                :to="{ name: 'login', query: { redirect: '/app' } }"
                class="w-full rounded-xl border border-white/15 bg-white/5 px-7 py-3 text-sm font-medium text-white backdrop-blur-xl transition hover:border-white/25 hover:bg-white/10 sm:w-auto"
              >
                Log in to demo
              </RouterLink>
            </div>

            <!-- Trust strip: $ / trial / no per-seat -->
            <p class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-400 sm:justify-start">
              <span>$69/project</span>
              <span class="h-1 w-1 rounded-full bg-slate-600" />
              <span>15-day free trial</span>
              <span class="h-1 w-1 rounded-full bg-slate-600" />
              <span>No per-seat pricing</span>
            </p>
          </div>

          <!-- Right: screenshot panel.
               When public/screenshots/hero-dashboard.png exists, it renders.
               Otherwise the placeholder card behind shows a tidy fallback so
               the page never looks broken during development. -->
          <div class="w-full flex-1 md:w-auto">
            <div
              class="relative mx-auto max-w-xl -rotate-1 rounded-3xl border border-white/15 bg-white/5 p-2 shadow-[0_30px_80px_rgba(2,6,23,0.6)] backdrop-blur-2xl"
            >
              <!-- Window chrome (the trafficlight dots, like in the app's sidebar header) -->
              <div class="flex items-center gap-1.5 px-3 py-2">
                <span class="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                <span class="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                <span class="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              </div>

              <!-- Screenshot frame -->
              <div class="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                <!-- Placeholder shown behind the <img>. Visible until the real
                     screenshot file lands at the path below. -->
                <div
                  class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950"
                >
                  <div class="space-y-2 px-6 text-center">
                    <p class="text-xs font-semibold uppercase tracking-widest text-sky-400/80">
                      Dashboard preview
                    </p>
                    <p class="text-sm text-slate-400">
                      Drop screenshot at
                      <code class="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-200">public/screenshots/hero-dashboard.png</code>
                    </p>
                  </div>
                </div>
                <!-- Real screenshot. Hidden via onerror if the file isn't there
                     yet, so the placeholder above takes over without a broken
                     image icon. -->
                <img
                  src="/screenshots/hero-dashboard.png"
                  alt="Cxma project dashboard"
                  loading="eager"
                  class="relative h-full w-full object-cover object-left-top"
                  onerror="this.style.display='none'"
                >
              </div>

              <!-- Floating analytics chip — keeps the visual interest the old
                   mockup had, but small enough not to fight a real screenshot. -->
              <div
                class="absolute -bottom-6 -right-4 hidden w-44 rounded-2xl border border-white/15 bg-slate-900/90 p-3 text-xs text-slate-100 shadow-[0_18px_45px_rgba(2,6,23,0.7)] backdrop-blur-xl sm:block"
              >
                <p class="text-[0.65rem] font-medium uppercase tracking-wider text-slate-400">
                  Avg. resolve time
                </p>
                <p class="mt-1 text-lg font-semibold text-white">
                  3.8 days
                </p>
                <p class="mt-1 text-[0.65rem] text-emerald-400">
                  –21% vs last project
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- FEATURE STRIP: Issues / Checklists / FPTs -->
      <!-- Anchor for header nav: #workflows -->
      <span
        id="workflows"
        class="block"
      />
      <section
        id="features"
        class="pb-20"
      >
        <div class="mx-auto max-w-6xl px-4 md:px-6">
          <div class="mx-auto max-w-3xl text-center">
            <h2 class="text-2xl font-semibold sm:text-3xl">
              Everything a commissioning team needs.
            </h2>
            <p class="mt-3 text-sm text-slate-600 sm:text-base dark:text-slate-300">
              Cxma is built for the real workflows you use every day — issue
              logs, reusable checklists, and step-by-step functional performance
              tests.
            </p>
          </div>

          <div class="mt-10 grid gap-6 md:grid-cols-3">
            <!-- Issues -->
            <div
              class="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/75 p-5 text-sm shadow-[0_16px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80 dark:shadow-[0_18px_55px_rgba(0,0,0,0.80)]"
            >
              <div
                class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300"
              >
                <svg
                  class="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                  />
                  <line
                    x1="12"
                    y1="8"
                    x2="12"
                    y2="12"
                  />
                  <line
                    x1="12"
                    y1="16"
                    x2="12.01"
                    y2="16"
                  />
                </svg>
              </div>
              <h3 class="font-semibold text-slate-900 dark:text-slate-50">
                Issue log
              </h3>
              <p class="text-slate-600 dark:text-slate-300">
                Capture severity, system, assignee, due date, and status. Track
                everything from punch-list items to persistent performance
                problems.
              </p>
            </div>

            <!-- Checklists -->
            <div
              class="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/75 p-5 text-sm shadow-[0_16px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80 dark:shadow-[0_18px_55px_rgba(0,0,0,0.80)]"
            >
              <div
                class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
              >
                <svg
                  class="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="9 11 12 14 22 4" />
                  <path
                    d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
                  />
                </svg>
              </div>
              <h3 class="font-semibold text-slate-900 dark:text-slate-50">
                Reusable checklists
              </h3>
              <p class="text-slate-600 dark:text-slate-300">
                Standardize system and equipment checks with templates that
                support comments, attachments, and Pass / Fail / N/A status.
              </p>
            </div>

            <!-- FPTs -->
            <div
              class="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/75 p-5 text-sm shadow-[0_16px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80 dark:shadow-[0_18px_55px_rgba(0,0,0,0.80)]"
            >
              <div
                class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
              >
                <svg
                  class="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="5 13 9 17 19 7" />
                  <path
                    d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"
                  />
                  <path
                    d="M9 21h6"
                  />
                </svg>
              </div>
              <h3 class="font-semibold text-slate-900 dark:text-slate-50">
                Functional performance tests
              </h3>
              <p class="text-slate-600 dark:text-slate-300">
                Separate test structures with expected vs actual results,
                approvals, and step-by-step execution for every system.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- PRICING: Simple, project-based pricing -->
      <section
        id="pricing"
        class="pb-20"
      >
        <div class="mx-auto max-w-6xl px-4 md:px-6">
          <div class="mx-auto max-w-3xl text-center">
            <h2 class="text-2xl font-semibold sm:text-3xl">
              Simple, project-based, monthly/annual pricing
            </h2>
            <p class="mt-3 text-sm text-slate-600 sm:text-base dark:text-slate-300">
              Basic: $69 / project · Standard: $129 / project · Premium: $249 / project. Stripe-powered subscriptions with a 15-day free period when a project starts.
            </p>
            <div class="mt-6 flex items-center justify-center gap-3">
              <RouterLink
                :to="{ name: 'pricing' }"
                class="rounded-xl border border-slate-200/80 bg-white/70 px-6 py-3 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-xl transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                View full pricing
              </RouterLink>
              <RouterLink
                :to="{ name: 'register' }"
                class="rounded-xl bg-gradient-to-tr from-sky-500 to-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(56,189,248,0.55)] transition hover:from-sky-600 hover:to-sky-700"
              >
                Get started free
              </RouterLink>
            </div>
          </div>
        </div>
      </section>

      <!-- FINAL CTA: Ready to give your commissioning a home? -->
      <section
        id="cta"
        class="pb-24"
      >
        <div class="mx-auto max-w-6xl px-4 md:px-6">
          <div
            class="rounded-3xl border border-white/80 bg-white/70 p-8 text-center shadow-[0_22px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-slate-700/80 dark:bg-slate-900/80 dark:shadow-[0_24px_70px_rgba(0,0,0,0.85)]"
          >
            <h2 class="text-2xl font-semibold sm:text-3xl">
              Ready to give your commissioning a proper home?
            </h2>
            <p class="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
              Spin up a project in minutes and invite your team. Keep issues, checklists, and FPTs organized from day one.
            </p>
            <div class="mt-6 flex items-center justify-center gap-3">
              <RouterLink
                :to="{ name: 'register' }"
                class="rounded-xl bg-gradient-to-tr from-sky-500 to-sky-600 px-7 py-3 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(56,189,248,0.55)] transition hover:from-sky-600 hover:to-sky-700"
              >
                Get started free
              </RouterLink>
              <RouterLink
                :to="{ name: 'login', query: { redirect: '/app' } }"
                class="rounded-xl border border-slate-200/80 bg-white/70 px-7 py-3 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-xl transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                Log in to demo
              </RouterLink>
            </div>
          </div>
        </div>
      </section>

      <!-- ROLES / RBAC -->
      <section
        id="roles"
        class="pb-20"
      >
        <div class="mx-auto max-w-6xl px-4 md:px-6">
          <div
            class="grid gap-10 rounded-3xl border border-white/80 bg-white/70 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-slate-700/80 dark:bg-slate-900/80 dark:shadow-[0_24px_70px_rgba(0,0,0,0.85)] md:grid-cols-[1.1fr,0.9fr] md:p-10"
          >
            <div class="space-y-4">
              <h2 class="text-2xl font-semibold sm:text-3xl">
                Role-based views that mirror your project team.
              </h2>
              <p class="text-sm text-slate-600 sm:text-base dark:text-slate-300">
                Cxma supports admins, CxAs, engineers, contractors, client
                reps, and guests — with project-level assignments and field
                visibility tuned per role.
              </p>
              <ul class="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li>• Filter dashboards by active project and user role.</li>
                <li>• Limit edit access to the right team members.</li>
                <li>• Assign issues, checklists, and FPTs per user.</li>
              </ul>
            </div>

            <div class="space-y-3 text-sm">
              <div
                class="flex items-center justify-between rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80"
              >
                <span class="text-slate-700 dark:text-slate-100">
                  CxA · Admin
                </span>
                <span
                  class="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                >
                  Full access
                </span>
              </div>
              <div
                class="flex items-center justify-between rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80"
              >
                <span class="text-slate-700 dark:text-slate-100">
                  Contractors
                </span>
                <span
                  class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                >
                  Assigned systems
                </span>
              </div>
              <div
                class="flex items-center justify-between rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80"
              >
                <span class="text-slate-700 dark:text-slate-100">
                  Client & reps
                </span>
                <span
                  class="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                >
                  Read-only dashboards
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <PublicFooter />
  </div>
</template>

<script setup lang="ts">
import PublicHeader from '../../components/public/PublicHeader.vue'
import PublicFooter from '../../components/public/PublicFooter.vue'
</script>
