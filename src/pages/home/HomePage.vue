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

    <!-- HEADER (marketing-style, but app-flavored) -->
    <header
      class="sticky top-0 z-30 border-b border-slate-200/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70"
    >
      <div
        class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6"
      >
        <!-- Logo -->
        <div class="flex items-center gap-2">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80 shadow-md shadow-slate-300/60 ring-1 ring-slate-200/70 backdrop-blur-xl dark:bg-slate-900/80 dark:ring-slate-700/70 dark:shadow-black/40"
          >
            <span class="text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100">Cxma</span>
          </div>
        </div>

        <!-- Nav -->
        <nav class="hidden items-center gap-7 text-sm text-slate-600 dark:text-slate-300 md:flex">
          <a href="#features" class="hover:text-slate-900 dark:hover:text-white">Features</a>
          <a href="#workflows" class="hover:text-slate-900 dark:hover:text-white">Workflows</a>
          <a href="#roles" class="hover:text-slate-900 dark:hover:text-white">Roles</a>
          <a href="#pricing" class="hover:text-slate-900 dark:hover:text-white">Pricing</a>
        </nav>

        <!-- Actions -->
        <div class="hidden items-center gap-4 md:flex">
          <RouterLink
            :to="{ name: 'login', query: { redirect: '/app' } }"
            class="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
          >
            Log in
          </RouterLink>
          <RouterLink
            :to="{ name: 'register' }"
            class="rounded-xl bg-gradient-to-tr from-sky-500 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.45)] transition hover:from-sky-600 hover:to-sky-700"
          >
            Get started
          </RouterLink>
        </div>

        <!-- Mobile menu button (non-functional placeholder; hook into your UI store later) -->
        <button
          class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 p-2 text-slate-700 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 md:hidden"
        >
          <span class="sr-only">Open menu</span>
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line
              x1="3"
              y1="6"
              x2="21"
              y2="6"
            />
            <line
              x1="3"
              y1="12"
              x2="21"
              y2="12"
            />
            <line
              x1="3"
              y1="18"
              x2="21"
              y2="18"
            />
          </svg>
        </button>
        <!-- Mobile actions: mirror login/register for consistency -->
        <div class="flex items-center gap-3 md:hidden">
          <RouterLink
            :to="{ name: 'login', query: { redirect: '/app' } }"
            class="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
          >
            Log in
          </RouterLink>
          <RouterLink
            :to="{ name: 'register' }"
            class="rounded-lg bg-gradient-to-tr from-sky-500 to-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(56,189,248,0.45)]"
          >
            Get started
          </RouterLink>
        </div>
      </div>
    </header>

    <main>
      <!-- HERO: hybrid marketing + product, with glass dashboard preview -->
      <section class="relative">
        <div
          class="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 pb-20 pt-12 md:flex-row md:gap-16 md:px-6 md:pb-28 md:pt-20"
        >
          <!-- Left: messaging -->
          <div class="flex-1 space-y-6 text-center md:text-left">
            <p
              class="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-sky-700 shadow-sm ring-1 ring-sky-100/80 backdrop-blur-xl dark:bg-slate-900/80 dark:text-sky-300 dark:ring-sky-500/40"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Commissioning dashboard · Issues · Checklists · FPTs
            </p>

            <h1
              class="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-slate-50"
            >
              A glass-smooth home for
              <br class="hidden sm:inline">
              your commissioning data.
            </h1>

            <p class="text-base text-slate-600 sm:text-lg dark:text-slate-300">
              Cxma brings issue logs, equipment checklists, and functional
              performance tests into a single glassmorphic workspace — with
              role-based views, offline support, and project-aware dashboards.
            </p>

            <div
              class="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-start"
            >
              <RouterLink
                :to="{ name: 'register' }"
                class="w-full rounded-xl bg-gradient-to-tr from-sky-500 to-sky-600 px-7 py-3 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(56,189,248,0.55)] transition hover:from-sky-600 hover:to-sky-700 sm:w-auto"
              >
                Get started in minutes
              </RouterLink>
              <RouterLink
                :to="{ name: 'login', query: { redirect: '/app' } }"
                class="w-full rounded-xl border border-slate-200/80 bg-white/70 px-7 py-3 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-xl transition hover:border-slate-300 hover:bg-white sm:w-auto dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                Log in to demo
              </RouterLink>
            </div>

            <p class="text-xs text-slate-500 dark:text-slate-400">
              SPA · PWA-ready · Offline-capable · Powered by Vue 3 + Node/Express.
            </p>
          </div>

          <!-- Right: glass dashboard preview (matches app’s vibe) -->
          <div class="flex-1">
            <div
              class="relative mx-auto max-w-md rounded-3xl border border-white/80 bg-white/60 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.25)] backdrop-blur-2xl dark:border-slate-700/80 dark:bg-slate-900/70 dark:shadow-[0_24px_70px_rgba(0,0,0,0.65)]"
            >
              <!-- Top bar -->
              <div class="mb-4 flex items-center justify-between gap-3">
                <div class="flex items-center gap-1.5">
                  <span class="h-2.5 w-2.5 rounded-full bg-rose-400/90" />
                  <span class="h-2.5 w-2.5 rounded-full bg-amber-300/90" />
                  <span class="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                </div>
                <div class="h-3 w-32 rounded-full bg-slate-100 dark:bg-slate-800" />
                <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100/80 dark:bg-slate-800/80">
                  <span class="h-4 w-4 rounded-full bg-sky-400/80 dark:bg-sky-400" />
                </div>
              </div>

              <!-- Body: fake but app-like layout -->
              <div class="grid grid-cols-[0.9fr,1.1fr] gap-3">
                <!-- Left column: sidebar-ish -->
                <div class="space-y-3">
                  <div
                    class="rounded-2xl border border-white/70 bg-white/70 p-3 text-[10px] shadow-sm backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80"
                  >
                    <p class="text-[0.65rem] font-semibold text-slate-500 dark:text-slate-400">
                      Active project
                    </p>
                    <p class="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-50">
                      Central Utility Plant
                    </p>
                    <p class="mt-1 text-[0.65rem] text-slate-500 dark:text-slate-400">
                      Issues · Checklists · FPTs
                    </p>
                  </div>

                  <div
                    class="space-y-2 rounded-2xl border border-white/70 bg-white/70 p-3 text-[10px] shadow-sm backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-[0.65rem] text-slate-500 dark:text-slate-400">
                        Open issues
                      </span>
                      <span
                        class="rounded-full bg-rose-100 px-2 py-0.5 text-[0.65rem] font-semibold text-rose-600 dark:bg-rose-500/20 dark:text-rose-300"
                      >
                        34
                      </span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-[0.65rem] text-slate-500 dark:text-slate-400">
                        Checklists in progress
                      </span>
                      <span
                        class="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                      >
                        12
                      </span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-[0.65rem] text-slate-500 dark:text-slate-400">
                        FPTs scheduled
                      </span>
                      <span
                        class="rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      >
                        7
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Right column: main cards -->
                <div class="space-y-3">
                  <div
                    class="rounded-2xl border border-white/70 bg-white/80 p-3 text-[10px] shadow-sm backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-[0.65rem] font-semibold text-slate-500 dark:text-slate-400">
                        Issue log summary
                      </span>
                      <span class="h-2 w-10 rounded-full bg-sky-100 dark:bg-sky-900" />
                    </div>
                    <div class="mt-2 grid grid-cols-3 gap-2">
                      <div class="space-y-1">
                        <p class="text-[0.6rem] text-slate-500 dark:text-slate-400">
                          Open
                        </p>
                        <p class="text-xs font-semibold text-rose-500 dark:text-rose-300">
                          18
                        </p>
                      </div>
                      <div class="space-y-1">
                        <p class="text-[0.6rem] text-slate-500 dark:text-slate-400">
                          In progress
                        </p>
                        <p class="text-xs font-semibold text-amber-500 dark:text-amber-300">
                          9
                        </p>
                      </div>
                      <div class="space-y-1">
                        <p class="text-[0.6rem] text-slate-500 dark:text-slate-400">
                          Closed (7d)
                        </p>
                        <p class="text-xs font-semibold text-emerald-500 dark:text-emerald-300">
                          23
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    class="rounded-2xl border border-white/70 bg-white/80 p-3 text-[10px] shadow-sm backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-[0.65rem] font-semibold text-slate-500 dark:text-slate-400">
                        Upcoming commissioning tasks
                      </span>
                      <span class="h-2 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900" />
                    </div>
                    <div class="mt-2 space-y-1.5">
                      <div class="flex items-center justify-between">
                        <span class="h-2 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
                        <span class="text-[0.6rem] text-slate-500 dark:text-slate-400">
                          Today
                        </span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="h-2 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
                        <span class="text-[0.6rem] text-slate-500 dark:text-slate-400">
                          +1 day
                        </span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="h-2 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
                        <span class="text-[0.6rem] text-slate-500 dark:text-slate-400">
                          +3 days
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Floating “analytics” card -->
              <div
                class="absolute -bottom-7 -right-4 w-40 rounded-2xl border border-white/80 bg-white/90 p-3 text-[10px] text-slate-700 shadow-[0_18px_45px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/95 dark:text-slate-100 dark:shadow-[0_18px_55px_rgba(0,0,0,0.85)]"
              >
                <p class="text-[0.65rem] font-medium text-slate-500 dark:text-slate-400">
                  Avg. time to resolve
                </p>
                <p class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  3.8 days
                </p>
                <p class="mt-1 text-[0.65rem] text-emerald-600 dark:text-emerald-400">
                  –21% vs last project
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- FEATURE STRIP: Issues / Checklists / FPTs -->
      <section
        id="features"
        class="pb-20"
      >
        <div class="mx-auto max-w-6xl px-4 md:px-6">
          <div class="mx-auto max-w-3xl text-center">
            <h2 class="text-2xl font-semibold sm:text-3xl">
              Everything a commissioning team needs, in one pane of glass.
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

      <!-- PRICING TEASER -->
      <section
        id="pricing"
        class="pb-20"
      >
        <div class="mx-auto max-w-6xl px-4 md:px-6">
          <div
            class="rounded-3xl border border-white/80 bg-gradient-to-r from-sky-50/90 via-white/95 to-emerald-50/90 px-6 py-10 text-center shadow-[0_22px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-slate-700/80 dark:bg-gradient-to-r dark:from-slate-900/90 dark:via-slate-900/95 dark:to-slate-900/90 dark:shadow-[0_24px_70px_rgba(0,0,0,0.9)] md:px-10"
          >
            <h2 class="text-2xl font-semibold sm:text-3xl">
              Simple, project-based pricing.
            </h2>
            <p class="mt-3 text-sm text-slate-600 sm:text-base dark:text-slate-300">
              Standard: <span class="font-semibold">$49</span> / project · Pro:
              <span class="font-semibold">$79</span> / project.
              Stripe-powered subscriptions with a 15-day free period when a
              project starts.
            </p>
            <div class="mt-5 flex justify-center">
              <RouterLink
                :to="{ name: 'pricing' }"
                class="rounded-xl border border-slate-200/80 bg-white/80 px-6 py-2.5 text-sm font-medium text-slate-900 shadow-sm backdrop-blur-xl transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                View full pricing
              </RouterLink>
            </div>
          </div>
        </div>
      </section>

      <!-- FINAL CTA -->
      <section class="pb-24">
        <div class="mx-auto max-w-6xl px-4 md:px-6">
          <div
            class="rounded-3xl border border-white/80 bg-white/80 px-6 py-10 text-center shadow-[0_22px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-slate-700/80 dark:bg-slate-900/85 dark:shadow-[0_24px_70px_rgba(0,0,0,0.9)] md:px-10"
          >
            <h2 class="text-2xl font-semibold sm:text-3xl">
              Ready to give your commissioning workflow a new surface?
            </h2>
            <p class="mt-3 text-sm text-slate-600 sm:text-base dark:text-slate-300">
              Spin up a project, invite your team, and start logging issues,
              checklists, and FPTs in a matter of minutes.
            </p>
            <div class="mt-5 flex justify-center gap-3">
              <RouterLink
                :to="{ name: 'register' }"
                class="rounded-xl bg-gradient-to-tr from-sky-500 to-sky-600 px-7 py-3 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(56,189,248,0.55)] transition hover:from-sky-600 hover:to-sky-700"
              >
                Get started free
              </RouterLink>
              <button
                class="rounded-xl border border-slate-200/80 bg-white/80 px-7 py-3 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-xl transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                Talk to our team
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- FOOTER -->
    <footer
      class="border-t border-slate-200/70 bg-white/80 text-xs text-slate-500 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400"
    >
      <div
        class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-6"
      >
        <div class="flex items-center gap-2">
          <div
            class="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900"
          >
            <span class="text-[0.7rem] font-semibold">Cx</span>
          </div>
          <span>Cxma</span>
        </div>
        <div class="flex flex-wrap gap-4 md:gap-6">
          <a
            href="#product"
            class="hover:text-slate-700 dark:hover:text-slate-200"
          >
            Product
          </a>
          <a
            href="#features"
            class="hover:text-slate-700 dark:hover:text-slate-200"
          >
            Workflows
          </a>
          <a
            href="#roles"
            class="hover:text-slate-700 dark:hover:text-slate-200"
          >
            Roles
          </a>
          <a
            href="#pricing"
            class="hover:text-slate-700 dark:hover:text-slate-200"
          >
            Pricing
          </a>
        </div>
        <p class="text-[0.7rem]">
          © {{ year }} Cxma. All rights reserved.
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>
