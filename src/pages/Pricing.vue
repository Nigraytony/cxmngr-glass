<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
    <PublicHeader />
    <div class="mx-auto max-w-7xl px-6 py-12 md:px-8">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="sr-only">Pricing</h1>
      </div>
      <form class="group/tiers isolate overflow-hidden">
        <div class="flow-root rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-10 pt-16 shadow-[0_24px_70px_rgba(15,23,42,0.45)] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="relative z-10 text-center">
              <h2 class="mx-auto max-w-4xl text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Pricing that grows with your projects
              </h2>
              <p class="mx-auto mt-4 max-w-2xl text-pretty text-base font-medium text-slate-300 sm:text-lg">
                Pay per active project. Monthly or annual billing with 10% off annually.
              </p>
              <div class="mt-10 flex justify-center">
                <fieldset aria-label="Billing frequency">
                  <div class="grid grid-cols-2 gap-x-1 rounded-full bg-white/10 p-1 text-center text-xs font-semibold text-white ring-1 ring-white/15">
                    <label class="group relative rounded-full px-3 py-1 has-[:checked]:bg-sky-600">
                      <input
                        type="radio"
                        name="frequency"
                        value="monthly"
                        class="absolute inset-0 appearance-none rounded-full"
                        :checked="billingCycle === 'monthly'"
                        @change="billingCycle = 'monthly'"
                      >
                      <span>Monthly</span>
                    </label>
                    <label class="group relative rounded-full px-3 py-1 has-[:checked]:bg-sky-600">
                      <input
                        type="radio"
                        name="frequency"
                        value="annually"
                        class="absolute inset-0 appearance-none rounded-full"
                        :checked="billingCycle === 'annual'"
                        @change="billingCycle = 'annual'"
                      >
                      <span>Annually</span>
                    </label>
                  </div>
                </fieldset>
              </div>
            </div>

            <div class="relative mx-auto mt-10 grid max-w-md grid-cols-1 gap-y-8 lg:mx-0 lg:-mb-14 lg:max-w-none lg:grid-cols-3">
              <svg
                viewBox="0 0 1208 1024"
                aria-hidden="true"
                class="absolute -bottom-48 left-1/2 h-[50rem] -translate-x-1/2 translate-y-1/2 [mask-image:radial-gradient(closest-side,white,transparent)] lg:-top-48 lg:bottom-auto lg:translate-y-0"
              >
                <ellipse
                  cx="604"
                  cy="512"
                  fill="url(#cxm-gradient-pricing)"
                  rx="604"
                  ry="512"
                />
                <defs>
                  <radialGradient id="cxm-gradient-pricing">
                    <stop stop-color="#38bdf8" />
                    <stop
                      offset="1"
                      stop-color="#818cf8"
                    />
                  </radialGradient>
                </defs>
              </svg>
              <div
                class="hidden lg:absolute lg:inset-x-px lg:bottom-0 lg:top-4 lg:block lg:rounded-t-2xl lg:bg-slate-800/70 lg:ring-1 lg:ring-white/10"
                aria-hidden="true"
              />

              <div
                v-for="tier in tiers"
                :key="tier.id"
                :class="[tier.featured ? 'z-10 bg-white text-slate-900 shadow-xl outline outline-1 outline-slate-900/10' : 'bg-slate-800/80 text-white outline outline-1 -outline-offset-1 outline-white/10 lg:bg-transparent lg:pb-14 lg:outline-0', 'group/tier relative rounded-2xl']"
                :data-featured="tier.featured ? 'true' : undefined"
              >
                <div class="p-8 lg:pt-12 xl:p-10 xl:pt-14">
                  <h3
                    :id="`tier-${tier.id}`"
                    class="text-sm font-semibold group-data-[featured]/tier:text-slate-900"
                  >
                    {{ tier.name }}
                  </h3>
                  <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between lg:flex-col lg:items-stretch">
                    <div class="mt-2 flex items-center gap-x-4">
                      <p class="text-4xl font-semibold tracking-tight group-[:not(:has([name=frequency][value=monthly]:checked))]/tiers:hidden group-data-[featured]/tier:text-slate-900">
                        {{ tier.price.monthly }}
                      </p>
                      <p class="text-4xl font-semibold tracking-tight group-[:not(:has([name=frequency][value=annually]:checked))]/tiers:hidden group-data-[featured]/tier:text-slate-900">
                        {{ tier.price.annually }}
                      </p>
                      <div class="text-sm">
                        <p class="group-data-[featured]/tier:text-slate-900">
                          USD
                        </p>
                        <p class="text-slate-300 group-[:not(:has([name=frequency][value=monthly]:checked))]/tiers:hidden group-data-[featured]/tier:text-slate-500">
                          Billed monthly
                        </p>
                        <p class="text-slate-300 group-[:not(:has([name=frequency][value=annually]:checked))]/tiers:hidden group-data-[featured]/tier:text-slate-500">
                          Billed annually
                        </p>
                      </div>
                    </div>
                    <RouterLink
                      :to="{ name: 'register' }"
                      :aria-describedby="`tier-${tier.id}`"
                      class="w-full rounded-md bg-white/10 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/75 group-data-[featured]/tier:bg-sky-600 group-data-[featured]/tier:shadow-sm group-data-[featured]/tier:hover:bg-sky-500 group-data-[featured]/tier:focus-visible:outline-sky-600 [&:not(.group[data-featured]_*)]:ring-1 [&:not(.group[data-featured]_*)]:ring-inset [&:not(.group[data-featured]_*)]:ring-white/10"
                    >
                      Choose {{ tier.name }}
                    </RouterLink>
                  </div>
                  <div class="mt-8 flow-root sm:mt-10">
                    <ul
                      role="list"
                      class="-my-2 divide-y divide-white/10 border-t border-white/10 text-sm group-data-[featured]/tier:divide-slate-900/10 group-data-[featured]/tier:border-slate-900/10 group-data-[featured]/tier:text-slate-700 lg:border-t-0"
                    >
                      <li
                        v-for="mainFeature in tier.highlights"
                        :key="mainFeature"
                        class="flex gap-x-3 py-2"
                      >
                        <span class="h-5 w-5 flex-none rounded-full bg-sky-500/20 text-sky-600 ring-1 ring-inset ring-sky-500/30 dark:bg-sky-500/20 dark:text-sky-300" />
                        {{ mainFeature }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Comparison -->
        <div class="relative bg-slate-50 dark:bg-slate-900 lg:pt-14">
          <div class="mx-auto max-w-7xl px-4 py-16 sm:py-24 lg:px-8">
            <!-- Mobile comparison -->
            <section
              aria-labelledby="mobile-comparison-heading"
              class="lg:hidden"
            >
              <h2
                id="mobile-comparison-heading"
                class="sr-only"
              >
                Feature comparison
              </h2>
              <div class="mx-auto max-w-2xl space-y-16">
                <div
                  v-for="tier in tiers"
                  :key="tier.id"
                  class="border-t border-slate-200 dark:border-slate-700"
                >
                  <div :class="[tier.featured ? 'border-sky-600' : 'border-transparent', '-mt-px w-72 border-t-2 pt-10 md:w-80']">
                    <h3 :class="[tier.featured ? 'text-sky-600' : 'text-slate-900 dark:text-slate-100', 'text-sm font-semibold']">
                      {{ tier.name }}
                    </h3>
                    <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {{ tier.description }}
                    </p>
                  </div>
                  <div class="mt-10 space-y-10">
                    <div
                      v-for="section in sections"
                      :key="section.name"
                    >
                      <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {{ section.name }}
                      </h4>
                      <div class="relative mt-6">
                        <div
                          aria-hidden="true"
                          class="absolute inset-y-0 right-0 hidden w-1/2 rounded-lg bg-white shadow-sm sm:block dark:bg-slate-800"
                        />
                        <div :class="[tier.featured ? 'ring-2 ring-sky-600' : 'ring-1 ring-slate-900/10 dark:ring-slate-700', 'relative rounded-lg bg-white shadow-sm sm:rounded-none sm:bg-transparent sm:shadow-none sm:ring-0 dark:bg-slate-900']">
                          <dl class="divide-y divide-slate-200 text-sm dark:divide-slate-700">
                            <div
                              v-for="feature in section.features"
                              :key="feature.name"
                              class="flex items-center justify-between px-4 py-3 sm:grid sm:grid-cols-2 sm:px-0"
                            >
                              <dt class="pr-4 text-slate-600 dark:text-slate-300">
                                {{ feature.name }}
                              </dt>
                              <dd class="flex items-center justify-end sm:justify-center sm:px-4">
                                <span
                                  v-if="typeof feature.tiers[tier.name] === 'string'"
                                  :class="tier.featured ? 'font-semibold text-sky-600' : 'text-slate-900 dark:text-slate-100'"
                                >{{ feature.tiers[tier.name] }}</span>
                                <template v-else>
                                  <span
                                    v-if="feature.tiers[tier.name] === true"
                                    class="mx-auto h-5 w-5 rounded-full bg-sky-500/20 ring-1 ring-inset ring-sky-500/30"
                                    aria-hidden="true"
                                  />
                                  <span
                                    v-else
                                    class="mx-auto h-5 w-5 rounded-full bg-slate-300/40 dark:bg-slate-700"
                                    aria-hidden="true"
                                  />
                                  <span class="sr-only">{{ feature.tiers[tier.name] === true ? 'Yes' : 'No' }}</span>
                                </template>
                              </dd>
                            </div>
                          </dl>
                        </div>
                        <div
                          aria-hidden="true"
                          :class="[tier.featured ? 'ring-2 ring-sky-600' : 'ring-1 ring-slate-900/10 dark:ring-slate-700', 'pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 rounded-lg sm:block']"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Desktop comparison -->
            <section
              aria-labelledby="comparison-heading"
              class="hidden lg:block"
            >
              <h2
                id="comparison-heading"
                class="sr-only"
              >
                Feature comparison
              </h2>
              <div class="grid grid-cols-4 gap-x-8 border-t border-slate-200 dark:border-slate-700 before:block">
                <div
                  v-for="tier in tiers"
                  :key="tier.id"
                  aria-hidden="true"
                  class="-mt-px"
                >
                  <div :class="[tier.featured ? 'border-sky-600' : 'border-transparent', 'border-t-2 pt-10']">
                    <p :class="[tier.featured ? 'text-sky-600' : 'text-slate-900 dark:text-slate-100', 'text-sm font-semibold']">
                      {{ tier.name }}
                    </p>
                    <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {{ tier.description }}
                    </p>
                  </div>
                </div>
              </div>
              <div class="-mt-6 space-y-16">
                <div
                  v-for="section in sections"
                  :key="section.name"
                >
                  <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {{ section.name }}
                  </h3>
                  <div class="relative -mx-8 mt-10">
                    <div
                      class="absolute inset-x-8 inset-y-0 grid grid-cols-4 gap-x-8 before:block"
                      aria-hidden="true"
                    >
                      <div class="size-full rounded-lg bg-white shadow-sm dark:bg-slate-900" />
                      <div class="size-full rounded-lg bg-white shadow-sm dark:bg-slate-900" />
                      <div class="size-full rounded-lg bg-white shadow-sm dark:bg-slate-900" />
                    </div>
                    <table class="relative w-full border-separate border-spacing-x-8">
                      <thead>
                        <tr class="text-left">
                          <th scope="col">
                            <span class="sr-only">Feature</span>
                          </th>
                          <th
                            v-for="tier in tiers"
                            :key="tier.id"
                            scope="col"
                          >
                            <span class="sr-only">{{ tier.name }} tier</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(feature, featureIdx) in section.features"
                          :key="feature.name"
                        >
                          <th
                            scope="row"
                            class="w-1/4 py-3 pr-4 text-left text-sm font-normal text-slate-900 dark:text-slate-100"
                          >
                            {{ feature.name }}
                            <div
                              v-if="featureIdx !== section.features.length - 1"
                              class="absolute inset-x-8 mt-3 h-px bg-slate-200 dark:bg-slate-700"
                            />
                          </th>
                          <td
                            v-for="tier in tiers"
                            :key="tier.id"
                            class="relative w-1/4 px-4 py-0 text-center"
                          >
                            <span class="relative size-full py-3">
                              <span
                                v-if="typeof feature.tiers[tier.name] === 'string'"
                                :class="[tier.featured ? 'font-semibold text-sky-600' : 'text-slate-900 dark:text-slate-100', 'text-sm']"
                              >{{ feature.tiers[tier.name] }}</span>
                              <template v-else>
                                <span
                                  v-if="feature.tiers[tier.name] === true"
                                  class="mx-auto h-5 w-5 rounded-full bg-sky-500/20 ring-1 ring-inset ring-sky-500/30"
                                  aria-hidden="true"
                                />
                                <span
                                  v-else
                                  class="mx-auto h-5 w-5 rounded-full bg-slate-300/40 dark:bg-slate-700"
                                  aria-hidden="true"
                                />
                                <span class="sr-only">{{ feature.tiers[tier.name] === true ? 'Yes' : 'No' }}</span>
                              </template>
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div
                      class="pointer-events-none absolute inset-x-8 inset-y-0 grid grid-cols-4 gap-x-8 before:block"
                      aria-hidden="true"
                    >
                      <div
                        v-for="tier in tiers"
                        :key="tier.id"
                        :class="[tier.featured ? 'ring-2 ring-sky-600' : 'ring-1 ring-slate-900/10 dark:ring-slate-700', 'rounded-lg']"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </form>
    </div>
    <PublicFooter />
  </div>
</template>

  <script setup>
  import { RouterLink } from 'vue-router'
  import { ref, computed } from 'vue'
  import PublicHeader from '../components/public/PublicHeader.vue'
  import PublicFooter from '../components/public/PublicFooter.vue'

  // Billing cycle: monthly vs annual (display only)
  const billingCycle = ref('monthly')
  const annualFactor = 0.9
  const baseMonthly = { basic: 29, standard: 49, premium: 79 }
  const monthlyText = (v) => `$${v}/month per project`
  const annualText = (v) => `$${Math.round(v * annualFactor)}/month per project`

  const tiers = computed(() => [
    {
      name: 'Basic',
      id: 'tier-basic',
      featured: false,
      description: 'Core access for small teams/projects.',
      price: {
        monthly: monthlyText(baseMonthly.basic),
        annually: annualText(baseMonthly.basic),
      },
      highlights: ['10 Users', '250 Issues', '50 Equipment', '250 Checklists', '50 FPTs'],
    },
    {
      name: 'Standard',
      id: 'tier-standard',
      featured: true,
      description: 'Full platform access (except Tasks) with higher limits.',
      price: {
        monthly: monthlyText(baseMonthly.standard),
        annually: annualText(baseMonthly.standard),
      },
      highlights: ['25 Users', '1000 Issues', '500 Equipment', '500 Checklists', '1000 FPTs', '1000 Spaces', '200 Templates', '500 Activities'],
    },
    {
      name: 'Premium',
      id: 'tier-premium',
      featured: false,
      description: 'Highest tier with Tasks and unlimited limits.',
      price: {
        monthly: monthlyText(baseMonthly.premium),
        annually: annualText(baseMonthly.premium),
      },
      highlights: ['200 Users', 'Unlimited Issues', 'Unlimited Equipment', 'Unlimited Checklists', 'Unlimited FPTs', 'Unlimited Spaces', 'Unlimited Templates', 'Unlimited Activities', 'Tasks Included', 'New Features First'],
    },
  ])

  const sections = [
    {
      name: 'Features',
      features: [
        { name: 'Issues', tiers: { Basic: '250', Standard: '1000', Premium: 'Unlimited' } },
        { name: 'Equipment', tiers: { Basic: '50', Standard: '500', Premium: 'Unlimited' } },
        { name: 'Checklists', tiers: { Basic: '250', Standard: '500', Premium: 'Unlimited' } },
        { name: 'FPTs', tiers: { Basic: '50', Standard: '1000', Premium: 'Unlimited' } },
        { name: 'Spaces', tiers: { Basic: '—', Standard: '1000', Premium: 'Unlimited' } },
        { name: 'Templates', tiers: { Basic: '—', Standard: '200', Premium: 'Unlimited' } },
        { name: 'Activities', tiers: { Basic: '—', Standard: '500', Premium: 'Unlimited' } },
        { name: 'Tasks', tiers: { Basic: '—', Standard: 'Not included', Premium: 'Included' } },
      ],
    },
    {
      name: 'Team',
      features: [
        { name: 'Users', tiers: { Basic: '10', Standard: '25', Premium: '200' } },
      ],
    },
  ]
</script>
