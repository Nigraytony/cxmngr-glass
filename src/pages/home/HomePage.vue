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
                <!-- Real screenshot. The path is bound dynamically (rather than
                     written as a static src=) so Vite's import-analyzer doesn't
                     try to resolve it at build time — without the file, we want
                     a graceful runtime 404 (caught by onerror) revealing the
                     placeholder behind, NOT a build failure. -->
                <img
                  :src="'/screenshots/hero-dashboard.png'"
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

      <!-- WORKFLOW WALKTHROUGH: 5 stepped panels with real product screenshots.
           Continues the hero's dark-glass band so hero → walkthrough feels like
           one composition. Each step alternates image-left / image-right for
           visual rhythm. Anchor ids #workflows and #features both kept for any
           existing nav links. -->
      <span
        id="workflows"
        class="block"
      />
      <section
        id="features"
        class="relative isolate overflow-hidden bg-slate-950 text-slate-100"
      >
        <!-- Subtle continuation of the hero's blob field, dialed down so the
             screenshots stay the focal point. -->
        <div class="pointer-events-none absolute inset-0 -z-10">
          <div class="absolute top-0 right-1/4 h-[28rem] w-[28rem] rounded-full bg-sky-500/10 blur-3xl" />
          <div class="absolute bottom-1/4 left-0 h-[26rem] w-[26rem] rounded-full bg-emerald-500/10 blur-3xl" />
          <div class="absolute bottom-0 right-0 h-[24rem] w-[24rem] rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <!-- Section intro -->
        <div class="mx-auto max-w-3xl px-4 pb-12 pt-6 text-center md:px-6 md:pb-20 md:pt-12">
          <h2 class="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            From OPR to Final Report.
            <span class="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">One platform.</span>
          </h2>
          <p class="mt-4 text-base text-slate-300 sm:text-lg">
            Five surfaces that take a project from kickoff to closeout — without ever leaving the app.
          </p>
        </div>

        <!-- Five stepped panels. Each step uses md:grid-cols-2 and alternates
             which side the screenshot sits on via order- classes. -->
        <div class="mx-auto max-w-6xl space-y-24 px-4 pb-24 md:px-6 md:pb-32">

          <!-- STEP 01 — Plan it (Cx Plan generator) -->
          <div class="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div class="order-2 space-y-4 md:order-1">
              <p class="text-sm font-semibold uppercase tracking-widest text-sky-400">
                Step 01 · Plan it
              </p>
              <h3 class="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Generate a Cx Plan from your project, not a Word template.
              </h3>
              <p class="text-base text-slate-300">
                Build a complete LEED v4 / v5 Commissioning Plan in minutes. Roles & responsibilities, milestones, scope, sampling — auto-populated from your project team and selected scope items, then editable in the rich-text editor.
              </p>
            </div>
            <div class="order-1 md:order-2">
              <div class="relative rounded-3xl border border-white/15 bg-white/5 p-2 shadow-[0_28px_70px_rgba(2,6,23,0.6)] backdrop-blur-xl">
                <div class="flex items-center gap-1.5 px-3 py-2">
                  <span class="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                  <span class="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                  <span class="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <div class="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                  <img
                    :src="'/screenshots/walkthrough-plan.png'"
                    alt="Cx Plan generator inside an Activity"
                    loading="lazy"
                    class="block h-auto w-full"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- STEP 02 — Build it (Equipment + Checklists + FPTs) -->
          <div class="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div class="space-y-4">
              <p class="text-sm font-semibold uppercase tracking-widest text-emerald-400">
                Step 02 · Build it
              </p>
              <h3 class="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Equipment, checklists, and FPTs in one place.
              </h3>
              <p class="text-base text-slate-300">
                Define your scoped systems once. Attach checklists and functional performance tests with expected-vs-actual fields, capture signatures in the field, and tie every finding back to a real piece of equipment.
              </p>
            </div>
            <div>
              <div class="relative rounded-3xl border border-white/15 bg-white/5 p-2 shadow-[0_28px_70px_rgba(2,6,23,0.6)] backdrop-blur-xl">
                <div class="flex items-center gap-1.5 px-3 py-2">
                  <span class="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                  <span class="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                  <span class="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <div class="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                  <img
                    :src="'/screenshots/walkthrough-build.png'"
                    alt="Equipment details with checklists and functional performance tests"
                    loading="lazy"
                    class="block h-auto w-full"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- STEP 03 — Manage it (Issues) -->
          <div class="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div class="order-2 space-y-4 md:order-1">
              <p class="text-sm font-semibold uppercase tracking-widest text-violet-400">
                Step 03 · Manage it
              </p>
              <h3 class="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                The issue log that actually keeps up.
              </h3>
              <p class="text-base text-slate-300">
                Punch items, persistent performance problems, design-review comments — all in one place, with severity, system, assignee, and due dates. Filter by anything. Search the rich-text descriptions instantly.
              </p>
            </div>
            <div class="order-1 md:order-2">
              <div class="relative rounded-3xl border border-white/15 bg-white/5 p-2 shadow-[0_28px_70px_rgba(2,6,23,0.6)] backdrop-blur-xl">
                <div class="flex items-center gap-1.5 px-3 py-2">
                  <span class="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                  <span class="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                  <span class="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <div class="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                  <img
                    :src="'/screenshots/walkthrough-manage.png'"
                    alt="Issues list with filters and severity badges"
                    loading="lazy"
                    class="block h-auto w-full"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- STEP 04 — Track it (Tasks Gantt) -->
          <div class="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div class="space-y-4">
              <p class="text-sm font-semibold uppercase tracking-widest text-amber-400">
                Step 04 · Track it
              </p>
              <h3 class="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                A real WBS, not a hidden Trello board.
              </h3>
              <p class="text-base text-slate-300">
                Schedule the entire Cx process — design review through warranty walkthrough — on a project Gantt. Roll up cost, track percent complete, and see what's blocking what. Skip the separate scheduling tool.
              </p>
            </div>
            <div>
              <div class="relative rounded-3xl border border-white/15 bg-white/5 p-2 shadow-[0_28px_70px_rgba(2,6,23,0.6)] backdrop-blur-xl">
                <div class="flex items-center gap-1.5 px-3 py-2">
                  <span class="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                  <span class="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                  <span class="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <div class="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                  <img
                    :src="'/screenshots/walkthrough-track.png'"
                    alt="Tasks list with project Gantt view"
                    loading="lazy"
                    class="block h-auto w-full"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- STEP 05 — Deliver it (Final Report) -->
          <div class="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div class="order-2 space-y-4 md:order-1">
              <p class="text-sm font-semibold uppercase tracking-widest text-rose-400">
                Step 05 · Deliver it
              </p>
              <h3 class="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                The Final Report writes itself.
              </h3>
              <p class="text-base text-slate-300">
                Every section LEED v4 / v5 expects, every signature, every metric — auto-generated from the work you've already done. Edit in the rich-text editor, export server-side to PDF, hand it over. No more rebuilding the report from scratch every project.
              </p>
            </div>
            <div class="order-1 md:order-2">
              <div class="relative rounded-3xl border border-white/15 bg-white/5 p-2 shadow-[0_28px_70px_rgba(2,6,23,0.6)] backdrop-blur-xl">
                <div class="flex items-center gap-1.5 px-3 py-2">
                  <span class="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                  <span class="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                  <span class="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <div class="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                  <img
                    :src="'/screenshots/walkthrough-deliver.png'"
                    alt="Final Report builder with LEED-aware sections"
                    loading="lazy"
                    class="block h-auto w-full"
                  >
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <!-- PRICING TEASER: dark band, three mini tier cards + link to /pricing.
           Shows the actual headline numbers so a buyer knows the order of
           magnitude without leaving the page; the full comparison still lives
           on the dedicated /pricing route. -->
      <section
        id="pricing"
        class="relative isolate overflow-hidden bg-slate-950 pt-4 pb-20 text-slate-100 md:pt-12 md:pb-28"
      >
        <!-- Subtle gradient continuation from the walkthrough above -->
        <div class="pointer-events-none absolute inset-0 -z-10">
          <div class="absolute top-1/4 left-1/4 h-[26rem] w-[26rem] rounded-full bg-sky-500/10 blur-3xl" />
          <div class="absolute bottom-0 right-1/4 h-[28rem] w-[28rem] rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div class="mx-auto max-w-5xl px-4 md:px-6">
          <div class="mx-auto max-w-3xl text-center">
            <h2 class="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Simple,
              <span class="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">project-based</span>
              pricing.
            </h2>
            <p class="mt-4 text-base text-slate-300 sm:text-lg">
              Monthly or annual. 15-day free trial when you start a project. <span class="text-white">No per-seat traps.</span>
            </p>
          </div>

          <!-- Mini tier cards: Basic / Standard (featured) / Premium -->
          <div class="mt-10 grid gap-4 sm:grid-cols-3">
            <!-- Basic -->
            <div class="rounded-2xl border border-white/10 bg-white/5 p-5 text-left shadow-[0_18px_45px_rgba(2,6,23,0.4)] backdrop-blur-xl">
              <p class="text-xs font-semibold uppercase tracking-widest text-sky-400">Basic</p>
              <p class="mt-2 text-3xl font-semibold tracking-tight text-white">
                $69<span class="text-sm font-medium text-slate-400">/project · mo</span>
              </p>
              <p class="mt-2 text-sm text-slate-300">
                Issues and Equipment for sole practitioners and the smallest teams.
              </p>
            </div>
            <!-- Standard (featured) -->
            <div class="relative rounded-2xl border border-sky-400/40 bg-gradient-to-br from-sky-500/15 via-white/5 to-emerald-500/10 p-5 text-left shadow-[0_24px_60px_rgba(2,6,23,0.55)] backdrop-blur-xl">
              <p class="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-sky-500 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white">
                Most popular
              </p>
              <p class="text-xs font-semibold uppercase tracking-widest text-emerald-300">Standard</p>
              <p class="mt-2 text-3xl font-semibold tracking-tight text-white">
                $129<span class="text-sm font-medium text-slate-300">/project · mo</span>
              </p>
              <p class="mt-2 text-sm text-slate-200">
                Full platform — Spaces, Activities, Final Report. The typical sweet spot.
              </p>
            </div>
            <!-- Premium -->
            <div class="rounded-2xl border border-white/10 bg-white/5 p-5 text-left shadow-[0_18px_45px_rgba(2,6,23,0.4)] backdrop-blur-xl">
              <p class="text-xs font-semibold uppercase tracking-widest text-violet-300">Premium</p>
              <p class="mt-2 text-3xl font-semibold tracking-tight text-white">
                $249<span class="text-sm font-medium text-slate-400">/project · mo</span>
              </p>
              <p class="mt-2 text-sm text-slate-300">
                Everything, plus Tasks, Templates, AI assistant. New features first.
              </p>
            </div>
          </div>

          <div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <RouterLink
              :to="{ name: 'pricing' }"
              class="w-full rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur-xl transition hover:border-white/25 hover:bg-white/10 sm:w-auto"
            >
              See full pricing
            </RouterLink>
            <RouterLink
              :to="{ name: 'register' }"
              class="w-full rounded-xl bg-gradient-to-tr from-sky-500 to-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(56,189,248,0.55)] transition hover:from-sky-600 hover:to-sky-700 sm:w-auto"
            >
              Start free trial
            </RouterLink>
          </div>
        </div>
      </section>

      <!-- FINAL CTA: dark band, big glass card. Closes the page with the same
           identity-first energy the hero opened with. -->
      <section
        id="cta"
        class="relative isolate overflow-hidden bg-slate-950 pb-24 text-slate-100 md:pb-32"
      >
        <!-- Punchy accent blob behind the card -->
        <div class="pointer-events-none absolute inset-0 -z-10">
          <div class="absolute top-0 left-1/2 h-[30rem] w-[40rem] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
          <div class="absolute bottom-0 right-0 h-[24rem] w-[24rem] rounded-full bg-sky-500/15 blur-3xl" />
        </div>

        <div class="mx-auto max-w-6xl px-4 md:px-6">
          <div
            class="relative overflow-hidden rounded-3xl border border-white/15 bg-white/5 p-8 text-center shadow-[0_36px_90px_rgba(2,6,23,0.7)] backdrop-blur-2xl md:p-14"
          >
            <!-- Inset accent gradient inside the card -->
            <div class="pointer-events-none absolute inset-0 -z-10">
              <div class="absolute -top-20 left-1/2 h-[20rem] w-[28rem] -translate-x-1/2 rounded-full bg-sky-500/15 blur-3xl" />
            </div>

            <p class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-sky-300 backdrop-blur-xl">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Built by CxAs, for CxAs
            </p>

            <h2 class="mx-auto mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Stop running commissioning out of spreadsheets.
            </h2>
            <p class="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
              Spin up a project in minutes, invite your team, and have your first Cx Plan, issue log, and Final Report skeleton in place by lunch.
            </p>

            <div class="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <RouterLink
                :to="{ name: 'register' }"
                class="w-full rounded-xl bg-gradient-to-tr from-sky-500 to-sky-600 px-7 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(56,189,248,0.55)] transition hover:from-sky-600 hover:to-sky-700 sm:w-auto"
              >
                Start your 15-day free trial
              </RouterLink>
              <RouterLink
                :to="{ name: 'login', query: { redirect: '/app' } }"
                class="w-full rounded-xl border border-white/15 bg-white/5 px-7 py-3 text-sm font-medium text-white backdrop-blur-xl transition hover:border-white/25 hover:bg-white/10 sm:w-auto"
              >
                Log in to demo
              </RouterLink>
            </div>

            <p class="mt-6 text-xs text-slate-400">
              No credit card to start · Cancel anytime · No per-seat pricing
            </p>
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
