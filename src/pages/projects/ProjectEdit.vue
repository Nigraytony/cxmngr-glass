<template>
  <section class="space-y-6 relative">
    <div>
      <BreadCrumbs :items="crumbs" />
    </div>
    <!-- global Toast is mounted in App.vue; toasts will be triggered via the ui store -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <button
        :class="tabClass('info')"
        class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center"
        @click="activeTab = 'info'"
      >
        <span class="i">ℹ️</span>
        <span>Info</span>
      </button>
      <button
        :class="tabClass('team')"
        class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center"
        @click="activeTab = 'team'"
      >
        <span class="i">👥</span>
        <span>Team</span>
      </button>

      <button
        :class="tabClass('logo')"
        class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center"
        @click="activeTab = 'logo'"
      >
        <span class="i">🖼️</span>
        <span>Logo</span>
      </button>

      <button
        :class="tabClass('subscription')"
        class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center"
        @click="activeTab = 'subscription'"
      >
        <span class="i">💳</span>
        <span>Subscription</span>
      </button>

      <button
        :class="tabClass('settings')"
        class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center"
        @click="activeTab = 'settings'"
      >
        <span class="i">⚙️</span>
        <span>Settings</span>
      </button>

      <button
        :class="tabClass('logs')"
        class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center"
        @click="activeTab = 'logs'"
      >
        <span class="i">📝</span>
        <span>Logs</span>
      </button>
    </div>

    <!-- Subscription diagnostics: show Stripe publishable key detection -->
    <div
      v-if="activeTab === 'subscription'"
      class="mb-3"
    >
      <div class="rounded p-3 bg-white/5 border border-white/10 text-sm">
        <div class="flex items-center gap-2">
          <span class="i">💳</span>
          <div>
            <div
              v-if="stripeKeyPresent"
              class="text-white/80"
            >
              Stripe publishable key detected.
            </div>
            <div
              v-else
              class="text-amber-300"
            >
              Stripe publishable key not configured (VITE_STRIPE_PUBLISHABLE_KEY).
            </div>
          </div>
        </div>
      </div>
    </div>

    <div>
      <div
        v-if="!project"
        class="rounded-2xl p-6 bg-white/6 border border-white/10 text-white/80 flex items-center gap-3"
        role="status"
        aria-live="polite"
      >
        <Spinner />
        <div>
          <p class="text-sm uppercase tracking-wide">
            Loading project…
          </p>
          <p class="text-xs text-white/60">
            Fetching project details
          </p>
        </div>
      </div>
      <div v-else>
        <div v-show="activeTab === 'info'">
          <ProjectForm
            v-model="project"
            :errors="formErrors"
          />
        </div>

        <div v-show="activeTab === 'team'">
          <h3 class="text-md font-medium mb-2">
            Team
          </h3>
          <p class="text-sm text-white/70 mb-4">
            Manage team membership and roles for this project.
          </p>
          <div class="space-y-2">
            <div
              v-for="member in (project.team || [])"
              :key="member._id || member.email"
              class="p-3 rounded bg-white/5"
            >
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-medium">
                    {{ member.firstName }} {{ member.lastName }}
                  </div>
                  <div class="text-xs text-white/70">
                    {{ member.email }} • {{ member.role }}
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <!-- Resend invite icon (left of badge) -->
                  <div
                    v-if="isProjectAdmin && (member.status || member.inviteStatus || (member._id ? 'active' : 'invited')) === 'invited'"
                    class="mr-2"
                  >
                    <div class="relative inline-block group">
                      <button
                        aria-label="Resend invitation"
                        :disabled="isResending(findInviteIdForMember(member))"
                        class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
                        @click.prevent="resendInviteForMember(member)"
                      >
                        <svg
                          v-if="!isResending(findInviteIdForMember(member))"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          class="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path
                            d="M3 8.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7z"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M3 8l9 6 9-6"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M16 11h6"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M19 8l3 3-3 3"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                        <svg
                          v-else
                          class="w-4 h-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke-width="2"
                            stroke-opacity="0.25"
                          />
                          <path
                            d="M22 12a10 10 0 0 1-10 10"
                            stroke-width="2"
                            stroke-linecap="round"
                          />
                        </svg>
                      </button>
                      <div
                        role="tooltip"
                        class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
                      >
                        Resend invite
                      </div>
                    </div>
                  </div>
                  <!-- Status badge (invited, rejected, active, etc.) -->
                  <div :class="['text-xs px-2 py-1 rounded', statusBadgeClass(member.status || member.inviteStatus || (member._id ? 'active' : 'invited'))]">
                    {{ statusLabel(member) }}
                  </div>
                  <!-- Action icons: Permissions, Remove -->
                  <div class="flex gap-2">
                    <div
                      v-if="isProjectAdmin"
                      class="relative inline-block group"
                    >
                      <button
                        aria-label="Edit permissions"
                        class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
                        @click.prevent="openPermsModal(member)"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          class="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                        >
                          <rect
                            x="6"
                            y="10"
                            width="12"
                            height="8"
                            rx="2"
                            stroke-width="1.5"
                          />
                          <path
                            d="M8 10V8a4 4 0 018 0v2"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </button>
                      <div
                        role="tooltip"
                        class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
                      >
                        Permissions
                      </div>
                    </div>
                    <div
                      v-if="isProjectAdmin"
                      class="relative inline-block group"
                    >
                      <button
                        aria-label="Edit member"
                        class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
                        @click.prevent="openEditMember(member)"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          class="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path
                            d="M3 21v-4.2a2 2 0 0 1 .6-1.4L17.7 2.3a1 1 0 0 1 1.4 0l2.6 2.6a1 1 0 0 1 0 1.4L7.6 20.4A2 2 0 0 1 6.2 21H3z"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </button>
                      <div
                        role="tooltip"
                        class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
                      >
                        Edit member
                      </div>
                    </div>
                    <div class="relative inline-block group">
                      <button
                        aria-label="Remove member"
                        class="w-8 h-8 grid place-items-center rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-200 border border-red-500/30"
                        @click="removeMember(member)"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          class="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path
                            d="M6 7h12"
                            stroke-width="1.5"
                            stroke-linecap="round"
                          />
                          <path
                            d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
                            stroke-width="1.5"
                          />
                          <rect
                            x="6"
                            y="7"
                            width="12"
                            height="14"
                            rx="2"
                            stroke-width="1.5"
                          />
                        </svg>
                      </button>
                      <div
                        role="tooltip"
                        class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
                      >
                        Remove
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- (Invites shown inline with team members; no separate invites list) -->

            <div class="pt-2">
              <h4 class="font-medium mb-2">
                Add member
              </h4>
              <div class="grid grid-cols-1 gap-2">
                <!-- Row 1: First / Last -->
                <div class="grid grid-cols-2 gap-2">
                  <input
                    v-model="newMember.firstName"
                    placeholder="First"
                    class="rounded p-2 bg-white/5 w-full placeholder-gray-400"
                  >
                  <input
                    v-model="newMember.lastName"
                    placeholder="Last"
                    class="rounded p-2 bg-white/5 w-full placeholder-gray-400"
                  >
                </div>

                <!-- Row 2: Email / Company / Role -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    v-model="newMember.email"
                    placeholder="Email"
                    class="rounded p-2 bg-white/5 w-full placeholder-gray-400"
                  >
                  <input
                    v-model="newMember.company"
                    placeholder="Company"
                    class="rounded p-2 bg-white/5 w-full placeholder-gray-400"
                  >
                  <select
                    v-model="newMember.role"
                    class="rounded p-2 bg-white/5 w-full"
                  >
                    <option
                      v-for="opt in assignableRoleOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.text }}
                    </option>
                  </select>
                  <div
                    v-if="billingSummary && billingSummary.hasStripe === false"
                    class="mt-2 text-xs text-red-300"
                  >
                    Proration preview disabled: Stripe not configured on server.
                  </div>
                </div>

                <div
                  v-if="selectedRoleTemplate"
                  class="px-2 py-1 text-sm text-white/70 bg-white/3 rounded"
                >
                  <div class="font-medium">
                    Permissions for "{{ selectedRoleTemplate.name }}"
                  </div>
                  <div class="mt-1 text-xs">
                    <template v-if="Array.isArray(selectedRoleTemplate.permissions) && selectedRoleTemplate.permissions.length">
                      <ul class="list-disc pl-4">
                        <li
                          v-for="perm in selectedRoleTemplate.permissions"
                          :key="perm"
                        >
                          {{ perm }}
                        </li>
                      </ul>
                    </template>
                    <template v-else>
                      <div class="text-xs text-white/60">
                        No explicit permissions on template
                      </div>
                    </template>
                  </div>
                </div>

                <div class="text-right">
                  <button
                    class="px-3 py-1 rounded bg-white/6"
                    @click="addMember"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'logo'">
          <h3 class="text-md font-medium mb-2">
            Logos
          </h3>
          <p class="text-sm text-white/70 mb-4">
            Manage both Client and Commissioning Agent logos. These are stored like user avatars (as URLs or data URIs).
          </p>

          <!-- Client Logo -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="rounded-lg p-4 bg-white/5 border border-white/10">
              <div class="font-medium mb-2">
                Client logo
              </div>
              <div class="flex items-center gap-4">
                <div class="w-28 h-28 rounded bg-white/6 flex items-center justify-center overflow-hidden border border-white/10">
                  <img
                    v-if="project.logo"
                    :src="project.logo"
                    alt="client logo"
                    class="object-contain w-full h-full"
                  >
                  <div
                    v-else
                    class="text-white/60 text-xs"
                  >
                    No logo
                  </div>
                </div>
                <div>
                  <input
                    ref="clientFileInput"
                    type="file"
                    accept="image/*"
                    @change="onClientLogoSelected"
                  >
                  <div class="mt-2 flex gap-2">
                    <button
                      class="px-3 py-1 rounded bg-red-500/20 text-red-400"
                      @click="removeClientLogo"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Commissioning Agent Logo -->
            <div class="rounded-lg p-4 bg-white/5 border border-white/10">
              <div class="font-medium mb-2">
                Commissioning Agent logo
              </div>
              <div class="flex items-center gap-4">
                <div class="w-28 h-28 rounded bg-white/6 flex items-center justify-center overflow-hidden border border-white/10">
                  <img
                    v-if="(project.commissioning_agent && project.commissioning_agent.logo)"
                    :src="project.commissioning_agent.logo"
                    alt="cxa logo"
                    class="object-contain w-full h-full"
                  >
                  <div
                    v-else
                    class="text-white/60 text-xs"
                  >
                    No logo
                  </div>
                </div>
                <div>
                  <input
                    ref="cxaFileInput"
                    type="file"
                    accept="image/*"
                    @change="onCxaLogoSelected"
                  >
                  <div class="mt-2 flex gap-2">
                    <button
                      class="px-3 py-1 rounded bg-red-500/20 text-red-400"
                      @click="removeCxaLogo"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'subscription'">
          <div class="space-y-6">
            <div
              v-if="billingLoading"
              class="text-white/70"
            >
              Loading billing…
            </div>
            <div
              v-if="billingError"
              class="text-red-300 text-sm"
            >
              {{ billingError }}
            </div>
            <h2 class="text-xl font-semibold">
              Project Billing
            </h2>
            <div
              v-if="upgradeFeature"
              class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-100"
            >
              <div class="font-semibold">
                Upgrade required
              </div>
              <div class="text-sm mt-1">
                To use {{ upgradeFeature }}, please upgrade your plan below.
              </div>
            </div>

            <div
              v-if="billingSummary?.dunning?.isPastDue || status === 'past_due'"
              class="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-100"
            >
              <div class="font-semibold">
                Payment issue
              </div>
              <div class="text-sm mt-1">
                We couldn’t process the last payment. Please update the payment method or retry. Last invoice:
                {{ billingSummary?.dunning?.lastInvoiceStatus || 'unknown' }} ({{ billingSummary?.dunning?.lastInvoiceId || 'n/a' }})
              </div>
            </div>

            <div class="p-4 rounded-lg bg-white/5 border border-white/10">
              <p>
                <strong>Status:</strong> {{ status }}
                <span
                  v-if="billingSummary?.updatedAt"
                  class="ml-2 text-xs text-white/60"
                >• Last updated: {{ new Date(billingSummary.updatedAt).toLocaleString() }}</span>
              </p>
              <p class="mt-2">
                <strong>Plan:</strong> {{ planLabel }}
              </p>
              <p
                v-if="billingSummary?.promotion"
                class="mt-2 text-sm text-white/80"
              >
                <strong>Discount:</strong>
                <span>
                  <template v-if="billingSummary.promotion.percentOff">
                    -{{ billingSummary.promotion.percentOff }}%
                  </template>
                  <template v-else-if="billingSummary.promotion.amountOff">
                    -{{ billingSummary.promotion.amountOff.toFixed(2) }} {{ (billingSummary.promotion.currency || 'usd').toUpperCase() }}
                  </template>
                  <template v-else>
                    Applied
                  </template>
                  <span v-if="billingSummary.promotion.couponName">
                    ({{ billingSummary.promotion.couponName }})
                  </span>
                </span>
              </p>
              <p v-if="billingSummary?.currentPeriodEnd || project.stripeCurrentPeriodEnd">
                <strong>Current period end:</strong>
                {{ new Date(billingSummary?.currentPeriodEnd || project.stripeCurrentPeriodEnd).toLocaleString() }}
              </p>
              <p v-if="status === 'trialing' && trialEndDate">
                <strong>Trial ends:</strong> {{ new Date(trialEndDate).toLocaleString() }}
              </p>
              <p v-if="status === 'trialing'">
                <strong>Trial days left:</strong> {{ trialDaysLeft }}
              </p>
              <p
                v-if="status === 'trialing'"
                class="text-xs text-white/70 mt-1"
              >
                Trial end is fixed from when the project was created and does not change when switching plans.
              </p>

              <div
                v-if="billingSummary?.defaultPaymentMethod"
                class="mt-3 text-sm text-white/80"
              >
                <strong>Payment method:</strong>
                <span class="ml-2">
                  {{ billingSummary.defaultPaymentMethod.brand || '' }} •••• {{ billingSummary.defaultPaymentMethod.last4 || '' }} exp {{ billingSummary.defaultPaymentMethod.exp_month }}/{{ billingSummary.defaultPaymentMethod.exp_year }}
                </span>
              </div>
              <div
                v-if="billingSummary?.billingAdmin"
                class="mt-2 text-sm text-white/80"
              >
                <strong>Billing admin:</strong>
                <span class="ml-2">
                  {{ billingSummary.billingAdmin.name || billingSummary.billingAdmin.email || billingSummary.billingAdmin.userId }}
                </span>
              </div>
            </div>

            <div class="p-4 rounded-lg bg-white/5 border border-white/10">
              <label class="block text-sm font-medium mb-2">Choose a plan</label>
              <div class="relative inline-block w-full">
                <select
                  v-model="selectedPrice"
                  class="w-full appearance-none rounded-lg p-2 bg-white/5 border border-white/10 text-white backdrop-blur-md focus:ring-0 focus:border-white/20"
                >
                  <option
                    v-for="p in prices"
                    :key="p.id"
                    :value="p.id"
                  >
                    {{ p.label }}
                  </option>
                </select>
                <!-- custom arrow -->
                <div class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/70">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                  >
                    <path
                      d="M6 8l4 4 4-4"
                      stroke="currentColor"
                      stroke-width="1.75"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
              </div>

              <div class="mt-2">
                <span
                  v-if="project && project.stripePriceId && project.stripePriceId === selectedPrice"
                  class="inline-block px-2 py-1 text-xs bg-white/10 rounded-full"
                >Current plan</span>
              </div>

              <!-- Selected plan details -->
              <div
                v-if="selectedPlanDetails"
                class="mt-4 p-3 rounded-lg bg-white/5 border border-white/10"
              >
                <div class="flex items-center justify-between">
                  <div class="font-medium text-white">
                    {{ selectedPlanDetails.name }}
                  </div>
                  <div class="text-white/80">
                    {{ selectedPlanDetails.price }}
                  </div>
                </div>
                <p
                  v-if="selectedPlanDetails.summary"
                  class="text-sm text-white/70 mt-1"
                >
                  {{ selectedPlanDetails.summary }}
                </p>
                <ul
                  v-if="selectedPlanDetails.features && selectedPlanDetails.features.length"
                  class="mt-2 list-disc list-inside text-white/80 text-sm space-y-1"
                >
                  <li
                    v-for="(f, i) in selectedPlanDetails.features"
                    :key="i"
                  >
                    {{ f }}
                  </li>
                </ul>
              </div>

              <div class="mt-4 flex gap-3">
                <button
                  :disabled="loading || (hasSubscription && isSamePlanSelected) || !canManageBilling"
                  :title="!canManageBilling ? 'You do not have permission to manage this project\'s subscription' : (hasSubscription && isSamePlanSelected ? 'Select a different plan to apply changes' : '')"
                  class="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                  @click="hasSubscription ? handleChangePlan() : startCheckout"
                >
                  {{ loading || planChangeLoading ? '...' : (hasSubscription ? (isSamePlanSelected ? 'Plan is active' : 'Apply plan') : 'Subscribe') }}
                </button>

                <button
                  v-if="billingSummary?.hasStripe !== false"
                  :disabled="planPreviewLoading || !selectedPrice"
                  :title="!selectedPrice ? 'Select a plan to preview proration' : (planPreviewLoading ? 'Loading preview…' : '')"
                  class="px-4 py-2 rounded border"
                  @click="handlePreviewPlan"
                >
                  {{ planPreviewLoading ? '...' : 'Preview proration' }}
                </button>

                <button
                  :disabled="loading || cancelLoading || resumeLoading"
                  class="px-4 py-2 rounded border"
                  @click="hasSubscription ? (billingSummary?.cancelAtPeriodEnd ? handleResume() : handleCancel(true)) : openBillingPortal"
                >
                  {{ billingSummary?.cancelAtPeriodEnd ? (resumeLoading ? '...' : 'Resume') : (cancelLoading ? '...' : 'Cancel at period end') }}
                </button>

                <button
                  v-if="!project?.stripeSubscriptionId || billingSummary?.hasStripe === false"
                  class="px-4 py-2 rounded border"
                  :disabled="reconcileLoading"
                  :title="'Attempt to link this project to the latest active Stripe subscription'"
                  @click="handleReconcileSubscription"
                >
                  {{ reconcileLoading ? 'Reconciling…' : 'Reconcile subscription link' }}
                </button>
              </div>

              <div class="mt-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <input
                  v-model="promotionCode"
                  placeholder="Promotion code"
                  class="w-full sm:w-64 rounded bg-white/5 border border-white/10 px-3 py-2 text-white"
                >
                <button
                  class="px-3 py-2 rounded bg-white/10 border border-white/20 text-sm"
                  :disabled="applyingPromotion || loading"
                  @click="hasSubscription ? applyPromotionToSubscription() : startCheckout()"
                >
                  {{ applyingPromotion ? 'Applying…' : (hasSubscription ? 'Apply to subscription' : 'Use at checkout') }}
                </button>
                <button
                  v-if="promotionCode"
                  class="px-3 py-2 rounded border border-white/20 text-sm"
                  :title="'Clear the pending promotion code'"
                  @click="promotionCode = ''"
                >
                  Remove promotion
                </button>
                <button
                  class="px-3 py-2 rounded bg-white/10 border border-white/20 text-sm"
                  :disabled="loading"
                  :title="'Reset this project\'s features to the current plan defaults'"
                  @click="resetFeaturesToPlanDefaults"
                >
                  Reset features to plan defaults
                </button>
              </div>

              <div
                v-if="planPreview && planPreview.lines && planPreview.lines.length"
                class="mt-3 text-sm text-white/80 bg-white/5 rounded-lg p-3 border border-white/10"
              >
                <div class="font-semibold mb-2">
                  Proration preview
                </div>
                <ul class="space-y-1">
                  <li
                    v-for="line in planPreview.lines"
                    :key="line.id"
                    class="flex justify-between"
                  >
                    <span>{{ line.description }}</span>
                    <span>{{ line.amount != null ? line.amount.toFixed(2) : '' }}</span>
                  </li>
                </ul>
                <div class="mt-2">
                  Amount due next invoice: {{ planPreview.amount_due != null ? planPreview.amount_due.toFixed(2) : 'n/a' }}
                </div>
                <div
                  v-if="planPreview.total_discount_amounts && planPreview.total_discount_amounts.length"
                  class="mt-2 text-xs text-white/70"
                >
                  Discounts applied:
                  <span
                    v-for="(d, idx) in planPreview.total_discount_amounts"
                    :key="idx"
                    class="inline-block ml-1"
                  >
                    -{{ d.amount != null ? (d.amount / 100).toFixed(2) : '' }} {{ (planPreview.currency || 'usd').toUpperCase() }}
                  </span>
                </div>
              </div>

              <div class="mt-3 text-sm text-white/80 bg-white/5 rounded-lg p-3 border border-white/10">
                <div class="font-semibold mb-1">
                  Upcoming invoice
                </div>
                <div>
                  <template v-if="billingSummary?.upcomingInvoice && billingSummary.upcomingInvoice.amount_due != null">
                    Estimated total: ${{ (billingSummary.upcomingInvoice.amount_due / 100).toFixed(2) }} {{ (billingSummary.upcomingInvoice.currency || 'usd').toUpperCase() }}
                  </template>
                  <template v-else>
                    Estimated total will appear after changes or near period end.
                  </template>
                </div>
              </div>
            </div>

            <div class="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
              <div class="font-medium">
                Billing admin
              </div>
              <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <select
                  v-model="billingAdminUserId"
                  class="w-full sm:w-80 rounded bg-white/5 border border-white/10 px-3 py-2 text-white"
                >
                  <option :value="null">
                    Select billing admin
                  </option>
                  <option
                    v-for="member in billingAdminOptions"
                    :key="member._id || member.email"
                    :value="member._id || member.email"
                  >
                    {{ member.firstName }} {{ member.lastName }} ({{ member.email }})
                  </option>
                </select>
                <button
                  class="px-4 py-2 rounded bg-white/10 border border-white/20"
                  :disabled="billingAdminLoading || !billingAdminUserId"
                  @click="handleChangeBillingAdmin"
                >
                  {{ billingAdminLoading ? '...' : 'Update billing admin' }}
                </button>
              </div>
            </div>

            <div class="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
              <div class="font-medium">
                Payment method
              </div>
              <div class="text-sm text-white/70">
                Use Stripe Elements to add a card, or paste a payment method ID to set default.
              </div>
              <div
                v-if="!stripePublishableKey"
                class="text-sm text-red-300"
              >
                Stripe publishable key not configured (VITE_STRIPE_PUBLISHABLE_KEY). Add to enable card capture.
              </div>
              <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <button
                  class="px-4 py-2 rounded bg-white/10 border border-white/20"
                  :disabled="paymentMethodLoading || !stripePublishableKey"
                  @click="handleSetupIntent"
                >
                  {{ paymentMethodLoading ? '...' : 'Start card setup' }}
                </button>
              </div>
              <BillingCardForm
                v-if="showCardForm && cardSetupClientSecret && stripePublishableKey"
                :client-secret="cardSetupClientSecret"
                :publishable-key="String(stripePublishableKey)"
                @success="handleCardSaved"
                @error="handleCardError"
                @cancel="handleCardCancel"
              />

              <div class="space-y-2">
                <div class="flex items-center gap-2 text-sm text-white/80">
                  <span class="font-medium">Saved cards</span>
                  <span
                    v-if="paymentMethodsLoading"
                    class="text-white/60"
                  >Loading…</span>
                  <button
                    class="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs"
                    :disabled="paymentMethodsLoading"
                    @click="loadPaymentMethods"
                  >
                    Refresh
                  </button>
                </div>
                <div
                  v-if="paymentMethodsError"
                  class="text-sm text-red-300"
                >
                  {{ paymentMethodsError }}
                </div>
                <div
                  v-if="!paymentMethodsLoading && (!paymentMethods || paymentMethods.length === 0)"
                  class="text-white/60 text-sm"
                >
                  No saved cards.
                </div>
                <div
                  v-for="pm in paymentMethods"
                  :key="pm.id"
                  class="flex items-center justify-between px-3 py-2 rounded bg-white/5 border border-white/10"
                >
                  <div class="text-sm text-white/80">
                    {{ pm.brand }} •••• {{ pm.last4 }} exp {{ pm.exp_month }}/{{ pm.exp_year }}
                    <span
                      v-if="pm.isDefault"
                      class="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-100"
                    >
                      Default
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      class="px-3 py-1 rounded bg-white/10 border border-white/20 text-xs"
                      :disabled="paymentMethodLoading || pm.isDefault"
                      @click="() => makeDefaultFromList(pm.id)"
                    >
                      Make default
                    </button>
                    <button
                      class="px-3 py-1 rounded bg-red-500/15 border border-red-500/30 text-red-200 text-xs"
                      :disabled="paymentMethodsLoading"
                      @click="handleDetach(pm.id)"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <button
                  class="px-3 py-2 rounded bg-white/10 border border-white/20 text-sm"
                  @click="showManualPm = !showManualPm"
                >
                  {{ showManualPm ? 'Hide manual PM entry' : 'Manual payment method ID' }}
                </button>
              </div>
              <div
                v-if="showManualPm"
                class="flex flex-col sm:flex-row gap-3 items-start sm:items-center"
              >
                <input
                  v-model="paymentMethodId"
                  placeholder="pm_xxx"
                  class="w-full sm:w-64 rounded bg-white/5 border border-white/10 px-3 py-2 text-white"
                >
                <button
                  class="px-4 py-2 rounded bg-blue-600 text-white"
                  :disabled="paymentMethodLoading"
                  @click="handleUpdatePaymentMethod"
                >
                  {{ paymentMethodLoading ? '...' : 'Set default' }}
                </button>
              </div>
            </div>

            <!-- Transactions: invoices/charges -->
            <div class="p-4 rounded-lg bg-white/5 border border-white/10 mt-4">
              <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
                <div class="font-medium text-base">
                  Transactions
                </div>
                <div class="flex flex-wrap items-center gap-2 text-xs">
                  <label class="flex items-center gap-1">
                    <span>Status</span>
                    <select
                      v-model="transactionsStatus"
                      class="px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-xs"
                      @change="transactionsPage=1; loadTransactions()"
                    >
                      <option value="all">All</option>
                      <option value="paid">Paid</option>
                      <option value="open">Open</option>
                      <option value="void">Void</option>
                      <option value="uncollectible">Uncollectible</option>
                      <option value="failed">Failed</option>
                      <option value="succeeded">Succeeded</option>
                    </select>
                  </label>
                  <label class="flex items-center gap-1">
                    <span>Type</span>
                    <select
                      v-model="transactionsType"
                      class="px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-xs"
                      @change="transactionsPage=1; loadTransactions()"
                    >
                      <option value="all">All</option>
                      <option value="invoice">Invoices</option>
                      <option value="charge">Charges</option>
                    </select>
                  </label>
                  <label class="flex items-center gap-1">
                    <span>Start</span>
                    <input
                      v-model="transactionsStart"
                      type="date"
                      class="px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-xs"
                      @change="transactionsPage=1; loadTransactions()"
                    >
                  </label>
                  <label class="flex items-center gap-1">
                    <span>End</span>
                    <input
                      v-model="transactionsEnd"
                      type="date"
                      class="px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-xs"
                      @change="transactionsPage=1; loadTransactions()"
                    >
                  </label>
                  <button
                    class="px-3 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/15"
                    :disabled="transactionsLoading"
                    @click="loadTransactions"
                  >
                    Refresh
                  </button>
                  <button
                    class="px-3 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/15"
                    :disabled="transactionsLoading"
                    @click="exportTransactionsCsv"
                  >
                    Export CSV
                  </button>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    class="px-2 py-1 rounded bg-white/6"
                    :disabled="transactionsPage<=1"
                    @click="txnPrevPage"
                  >
                    Prev
                  </button>
                  <div class="text-white/70">
                    Page {{ transactionsPage }} / {{ Math.max(1, Math.ceil((transactionsTotal || 0) / transactionsPerPage)) }}
                  </div>
                  <button
                    class="px-2 py-1 rounded bg-white/6"
                    :disabled="transactionsPage >= Math.max(1, Math.ceil((transactionsTotal || 0) / transactionsPerPage))"
                    @click="txnNextPage"
                  >
                    Next
                  </button>
                  <select
                    v-model.number="transactionsPerPage"
                    class="ml-3 px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
                    @change="transactionsPage=1; loadTransactions()"
                  >
                    <option :value="5">
                      5
                    </option>
                    <option :value="10">
                      10
                    </option>
                    <option :value="25">
                      25
                    </option>
                    <option :value="50">
                      50
                    </option>
                    <option :value="100">
                      100
                    </option>
                  </select>
                </div>
              </div>
              <div
                v-if="checkoutPending"
                class="mb-3 rounded bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-100"
              >
                Checkout is pending. If you just completed checkout, wait a moment and refresh. If it doesn’t link automatically, use “Reconcile subscription link”.
              </div>
              <div
                v-if="transactionsWarning"
                class="mb-3 rounded bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-xs text-yellow-100"
              >
                {{ transactionsWarning }}
              </div>
              <div
                v-if="transactionsLoading"
                class="text-white/70"
              >
                Loading…
              </div>
              <div
                v-else-if="!transactions.length"
                class="text-white/60"
              >
                No transactions found.
              </div>
              <table
                v-else
                class="min-w-full text-sm"
              >
                <thead class="bg-white/5 text-white/70 text-xs">
                  <tr>
                    <th class="px-3 py-2 text-left">
                      Type
                    </th>
                    <th class="px-3 py-2 text-left">
                      Date
                    </th>
                    <th class="px-3 py-2 text-left">
                      Amount (gross)
                    </th>
                    <th class="px-3 py-2 text-left">
                      Discount
                    </th>
                    <th class="px-3 py-2 text-left">
                      Net
                    </th>
                    <th class="px-3 py-2 text-left">
                      Status
                    </th>
                    <th class="px-3 py-2 text-left">
                      Coupon/Promo
                    </th>
                    <th class="px-3 py-2 text-left">
                      Description
                    </th>
                    <th class="px-3 py-2 text-left">
                      Link
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="txn in transactions"
                    :key="txn.id"
                    class="border-t border-white/10 hover:bg-white/3"
                  >
                    <td class="px-3 py-2 capitalize">
                      {{ txn.type }}
                    </td>
                    <td class="px-3 py-2">
                      {{ txn.ts ? new Date(txn.ts).toLocaleString() : '' }}
                    </td>
                    <td class="px-3 py-2">
                      {{ txn.amount != null ? (txn.amount.toFixed(2) + ' ' + (txn.currency || '').toUpperCase()) : '' }}
                    </td>
                    <td class="px-3 py-2">
                      {{ txn.discountAmount ? ('-' + txn.discountAmount.toFixed(2) + ' ' + (txn.currency || '').toUpperCase()) : '—' }}
                    </td>
                    <td class="px-3 py-2 truncate">
                      {{ txn.netAmount != null ? (txn.netAmount.toFixed(2) + ' ' + (txn.currency || '').toUpperCase()) : '' }}
                    </td>
                    <td class="px-3 py-2">
                      {{ txn.status }}
                    </td>
                    <td class="px-3 py-2">
                      <div class="flex flex-col text-xs">
                        <span v-if="txn.coupon && (txn.coupon.name || txn.coupon.id)">
                          {{ txn.coupon.name || txn.coupon.id }}
                        </span>
                        <span v-if="txn.promotionCodeId">
                          Code: {{ txn.promotionCodeId }}
                        </span>
                        <span v-if="!txn.coupon && !txn.promotionCodeId">
                          —
                        </span>
                      </div>
                    </td>
                    <td class="px-3 py-2 truncate">
                      {{ txn.description || '' }}
                    </td>
                    <td class="px-3 py-2">
                      <a
                        v-if="txn.invoiceUrl"
                        :href="txn.invoiceUrl"
                        target="_blank"
                        class="text-white/80 hover:underline"
                      >Invoice</a>
                      <a
                        v-if="txn.receiptUrl"
                        :href="txn.receiptUrl"
                        target="_blank"
                        class="ml-2 text-white/80 hover:underline"
                      >Receipt</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'settings'">
          <h3 class="text-md font-medium mb-2">
            Settings
          </h3>
          <p class="text-sm text-white/70 mb-4">
            Project-specific settings and flags.
          </p>
          <div class="rounded p-3">
            <div class="mb-6 rounded p-3 bg-white/5 border border-white/10">
              <div class="flex items-start justify-between">
                <div class="flex items-start gap-3">
                  <button
                    aria-label="Toggle project tags"
                    class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10 transform transition-transform"
                    @click="toggleProjectTagsOpen"
                  >
                    <svg
                      :class="['w-4 h-4 transform transition-transform', projectTagsOpen ? '' : 'rotate-180']"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <div>
                    <div class="font-medium text-white/90">
                      Project tags (tag library)
                    </div>
                    <div class="text-xs text-white/60">
                      Used for tag suggestions and bulk auto-tagging.
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-show="projectTagsOpen"
                class="mt-3"
              >
                <div class="flex flex-wrap gap-2 mt-2">
                  <span
                    v-for="t in (project?.tags || [])"
                    :key="t"
                    class="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white/80"
                  >
                    <span>{{ t }}</span>
                    <button
                      v-if="isProjectAdmin"
                      type="button"
                      class="text-white/60 hover:text-white"
                      aria-label="Remove tag"
                      @click="removeProjectTag(t)"
                    >
                      ×
                    </button>
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-2 max-w-xl">
                  <input
                    v-model="projectTagInput"
                    :disabled="!isProjectAdmin"
                    placeholder="Add a tag and press Enter…"
                    class="w-full px-3 py-2 rounded bg-white/10 border border-white/15 text-white placeholder-white/50 disabled:opacity-60"
                    @keydown.enter.prevent="addProjectTagFromInput"
                    @keydown.,.prevent="addProjectTagFromInput"
                  >
                  <button
                    type="button"
                    class="h-10 px-3 rounded bg-white/6 hover:bg-white/10 border border-white/15 text-white/80 text-sm disabled:opacity-60"
                    :disabled="!isProjectAdmin"
                    @click="addProjectTagFromInput"
                  >
                    Add
                  </button>
                </div>
                <p class="text-xs text-white/60 mt-1 max-w-2xl">
                  Tip: use commas or Enter to add multiple tags.
                </p>
              </div>
            </div>
            <!-- AI configuration (Premium only) -->
            <div class="mt-6 rounded p-3 bg-white/5 border border-white/10">
              <div class="flex items-start justify-between">
                <div class="flex items-start gap-3">
                  <button
                    aria-label="Toggle AI"
                    class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10 transform transition-transform"
                    @click="toggleAiOpen"
                  >
                    <svg
                      :class="['w-4 h-4 transform transition-transform', aiOpen ? '' : 'rotate-180']"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <div>
                    <div class="font-medium">
                      AI (Bring your own OpenAI key)
                    </div>
                    <div class="text-xs text-white/60">
                      Project-scoped API key stored encrypted server-side.
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-show="aiOpen"
                class="mt-3"
              >
                <div class="text-sm text-white/70 mb-3">
                  Store a project-scoped OpenAI API key (encrypted on the server). The key is never exposed back to the browser.
                </div>

                <div
                  v-if="!isProjectAdmin"
                  class="text-sm text-white/70"
                >
                  Only project admins can manage AI settings.
                </div>

                <div
                  v-else-if="aiNotInPlan"
                  class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-100"
                >
                  <div class="font-semibold">
                    Upgrade required
                  </div>
                  <div class="text-sm mt-1">
                    AI is available on the Premium plan.
                  </div>
                  <div class="mt-3">
                    <button
                      class="px-4 py-2 rounded bg-blue-600 text-white"
                      @click="goToSubscriptionForUpgrade('ai')"
                    >
                      View plans
                    </button>
                  </div>
                </div>

                <div v-else>
                  <div
                    v-if="aiError"
                    class="text-sm text-red-300 mb-2"
                  >
                    {{ aiError }}
                  </div>

                  <label class="flex items-center gap-2 text-sm text-white/80">
                    <input
                      v-model="aiEnabled"
                      type="checkbox"
                      class="rounded border-white/20 bg-white/10"
                    >
                    Enable AI for this project
                  </label>

                  <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-sm text-white/70">Provider</label>
                      <div class="relative">
                        <select
                          v-model="aiProvider"
                          class="w-full px-3 pr-10 py-2 rounded-md bg-white/10 border border-white/20 appearance-none"
                        >
                          <option value="openai">
                            OpenAI
                          </option>
                          <option value="gemini">
                            Google Gemini
                          </option>
                          <option value="claude">
                            Anthropic Claude
                          </option>
                        </select>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70"
                        ><path
                          d="M6 9l6 6 6-6"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        /></svg>
                      </div>
                    </div>
                    <div>
                      <label class="block text-sm text-white/70">Model</label>
                      <input
                        v-model="aiModel"
                        type="text"
                        placeholder="gpt-4o-mini"
                        class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-white/40"
                      >
                    </div>
                  </div>

                  <div class="mt-3">
                    <div class="flex items-center justify-between">
                      <label class="block text-sm text-white/70">OpenAI API key</label>
                      <span
                        class="text-xs px-2 py-0.5 rounded-full border"
                        :class="aiHasKey ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100' : 'bg-white/5 border-white/10 text-white/60'"
                      >
                        {{ aiHasKey ? 'Saved' : 'Not set' }}
                      </span>
                    </div>
                    <input
                      v-model="aiKeyDraft"
                      type="password"
                      autocomplete="off"
                      :placeholder="aiProvider === 'gemini' ? 'AIza…' : (aiProvider === 'claude' ? 'sk-ant-…' : 'sk-...')"
                      class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-white/40"
                    >
                    <div class="mt-1 text-xs text-white/60">
                      Leave blank to keep the existing key. Use “Clear key” to remove it.
                    </div>
                  </div>

                  <div class="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      class="px-4 py-2 rounded bg-white/20 border border-white/30 hover:bg-white/30 text-white disabled:opacity-60"
                      :disabled="aiSaving"
                      @click="saveAiSettings"
                    >
                      {{ aiSaving ? 'Saving…' : 'Save AI settings' }}
                    </button>
                    <button
                      class="px-4 py-2 rounded border border-white/20 hover:bg-white/10 text-white disabled:opacity-60"
                      :disabled="aiSaving || aiTesting"
                      @click="testAiSettings"
                    >
                      {{ aiTesting ? 'Testing…' : 'Test key' }}
                    </button>
                    <button
                      class="px-4 py-2 rounded bg-red-500/15 border border-red-500/30 text-red-200 hover:bg-red-500/25 disabled:opacity-60"
                      :disabled="aiSaving || !aiHasKey"
                      @click="clearAiKey"
                    >
                      Clear key
                    </button>
                    <span
                      v-if="aiLastVerifiedAt"
                      class="text-xs text-white/60"
                    >
                      Last verified: {{ new Date(aiLastVerifiedAt).toLocaleString() }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
              
            <!-- Roles card: project-scoped role templates -->
            <div
              class="mt-6 rounded p-3 bg-white/5 border border-white/10"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <button
                    aria-label="Toggle roles"
                    class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10 transform transition-transform"
                    @click="toggleRolesOpen"
                  >
                    <svg
                      :class="['w-4 h-4 transform transition-transform', rolesOpen ? '' : 'rotate-180']"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <div class="font-medium">
                    Roles
                  </div>
                </div>
                <div>
                  <div
                    v-if="canManageTeamRoles"
                    class="relative inline-block group"
                  >
                    <button
                      aria-label="Create role template"
                      class="w-8 h-8 grid place-items-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10"
                      @click="openRoleModal(null)"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          d="M12 5v14M5 12h14"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </button>
                    <div
                      role="tooltip"
                      class="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
                    >
                      Create project role
                    </div>
                  </div>
                </div>
              </div>
              <div v-show="rolesOpen">
                <div
                  v-if="canManageTeamRoles && missingStandardRoleTemplates.length"
                  class="mb-3 p-3 rounded bg-amber-500/10 border border-amber-400/20 text-sm text-amber-100"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <div class="font-medium">
                        Standard role templates missing
                      </div>
                      <div class="text-xs text-amber-100/80">
                        Add default permission templates for: {{ missingStandardRoleTemplates.join(', ') }}
                      </div>
                    </div>
                    <button
                      class="px-3 py-1 rounded bg-amber-500/20 border border-amber-400/30 hover:bg-amber-500/25 text-amber-50 disabled:opacity-60"
                      :disabled="seedRoleTemplatesBusy"
                      @click="seedMissingStandardRoleTemplates"
                    >
                      {{ seedRoleTemplatesBusy ? 'Adding…' : 'Add templates' }}
                    </button>
                  </div>
                </div>

                <div
                  v-if="!displayedRoleTemplates.length"
                  class="text-sm text-white/70"
                >
                  No project role templates.
                </div>
                <div class="space-y-1">
                  <div
                    v-for="(rt, idx) in displayedRoleTemplates"
                    :key="rt._id || rt.id"
                    class="p-0 rounded"
                  >
                    <div
                      v-if="Number(idx) > 0"
                      class="border-t border-white/10 mb-1"
                    />
                    <div
                      class="p-2 rounded bg-white/6 cursor-pointer"
                      @click.prevent="toggleRoleOpen(rt._id || rt.id)"
                    >
                      <div class="flex items-start justify-between">
                        <div>
                          <div class="font-medium text-white">
                            {{ rt.name }}
                          </div>
                          <div class="text-xs text-white/70">
                            {{ rt.description }}
                          </div>
                        </div>
                        <div class="flex items-center gap-2">
                          <div class="text-xs text-white/60 mr-2">
                            {{ (rt.permissions || []).length }} perms
                          </div>
                          <div class="flex gap-2">
                            <div
                              v-if="canManageTeamRoles"
                              class="relative inline-block group"
                            >
                              <button
                                aria-label="Edit role"
                                class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/8"
                                @click.stop.prevent="openRoleModal(rt)"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  class="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                >
                                  <path
                                    d="M3 21v-4.2a2 2 0 0 1 .6-1.4L17.7 2.3a1 1 0 0 1 1.4 0l2.6 2.6a1 1 0 0 1 0 1.4L7.6 20.4A2 2 0 0 1 6.2 21H3z"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                  />
                                </svg>
                              </button>
                              <div
                                role="tooltip"
                                class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
                              >
                                Edit
                              </div>
                            </div>

                            <div
                              v-if="canManageTeamRoles"
                              class="relative inline-block group"
                            >
                              <button
                                aria-label="Delete role"
                                class="w-8 h-8 grid place-items-center rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white border border-white/8"
                                @click.stop.prevent="deleteRoleTemplate(rt)"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  class="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                >
                                  <path
                                    d="M3 6h18M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6M10 6V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                  />
                                </svg>
                              </button>
                              <div
                                role="tooltip"
                                class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
                              >
                                Delete
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      v-show="isRoleOpen(rt._id || rt.id)"
                      class="mt-1 p-2 rounded bg-white/5"
                    >
                      <div class="grid grid-cols-2 gap-3 max-h-[260px] overflow-auto text-sm text-white/80">
                        <div
                          v-for="(ops, resource) in permMatrix"
                          :key="resource"
                          class="p-1 rounded"
                        >
                          <div class="font-medium text-white mb-2">
                            {{ permResourceLabel(resource) }}
                          </div>
                          <div class="grid grid-cols-4 gap-2 text-sm">
                            <label
                              v-for="op in ops"
                              :key="op"
                              class="inline-flex items-center gap-2"
                            >
                              <input
                                type="checkbox"
                                :checked="isPermChecked(rt._id || rt.id, `${resource}.${op}`)"
                                @change="togglePerm(rt._id || rt.id, `${resource}.${op}`)"
                              >
                              <span class="capitalize text-white/80">{{ op }}</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div class="mt-3 text-right">
                        <button
                          v-if="canManageTeamRoles"
                          class="px-3 py-1 rounded bg-white/6 mr-2"
                          @click="cancelRoleEdits(rt._id || rt.id, rt)"
                        >
                          Cancel
                        </button>
                        <button
                          v-if="canManageTeamRoles"
                          class="px-3 py-1 rounded bg-emerald-500 text-white"
                          :disabled="!hasRoleChanges(rt._id || rt.id, rt)"
                          @click="saveRoleInline(rt)"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Search mode + Issues per page (collapsed by default) -->
            <div class="mt-6 rounded p-3 bg-white/5 border border-white/10">
              <div class="flex items-start justify-between">
                <div class="flex items-start gap-3">
                  <button
                    aria-label="Toggle search and issues settings"
                    class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10 transform transition-transform"
                    @click="toggleSearchIssuesOpen"
                  >
                    <svg
                      :class="['w-4 h-4 transform transition-transform', searchIssuesOpen ? '' : 'rotate-180']"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <div>
                    <div class="font-medium text-white/90">
                      Search & Issues
                    </div>
                    <div class="text-xs text-white/60">
                      Search behavior and Issues list pagination.
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-show="searchIssuesOpen"
                class="mt-3"
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-white/80 mb-1">Search mode</label>
                    <div class="relative inline-block w-full max-w-sm">
                      <select
                        v-model="project.searchMode"
                        class="w-full appearance-none rounded-lg p-2 bg-white/5 border border-white/10 text-white backdrop-blur-md focus:ring-0 focus:border-white/20"
                      >
                        <option value="substring">
                          Substring
                        </option>
                        <option value="exact">
                          Exact
                        </option>
                        <option value="fuzzy">
                          Fuzzy
                        </option>
                      </select>
                      <div class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/70">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden
                        >
                          <path
                            d="M6 8l4 4 4-4"
                            stroke="currentColor"
                            stroke-width="1.75"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                    <p class="text-xs text-white/60 mt-1">
                      Controls how search filters work across list pages (Issues, Projects, Spaces, Activities).
                    </p>
                  </div>

                  <div>
                    <label class="block text-white/80 mb-1">Issues per page</label>
                    <div class="relative inline-block w-full max-w-sm">
                      <select
                        v-model.number="issuesPageSizeLocal"
                        class="w-full appearance-none rounded-lg p-2 bg-white/5 border border-white/10 text-white backdrop-blur-md focus:ring-0 focus:border-white/20"
                        @change="persistIssuesPageSize()"
                      >
                        <option :value="5">
                          5
                        </option>
                        <option :value="10">
                          10
                        </option>
                        <option :value="25">
                          25
                        </option>
                        <option :value="50">
                          50
                        </option>
                        <option :value="100">
                          100
                        </option>
                      </select>
                      <div class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/70">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden
                        >
                          <path
                            d="M6 8l4 4 4-4"
                            stroke="currentColor"
                            stroke-width="1.75"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                    <p class="text-xs text-white/60 mt-1">
                      Applies to the Issues list for this project. Saved locally.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- end Roles accordion wrapper -->
        <div v-show="activeTab === 'logs'">
          <h3 class="text-md font-medium mb-2">
            Project Logs
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3 items-stretch">
            <input
              v-model="logsSearch"
              placeholder="Search logs…"
              class="px-3 py-2 rounded bg-white/5 border border-white/10 w-full md:col-span-2"
            >
            <div class="relative">
              <select
                v-model="selectedType"
                class="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-white/90"
              >
                <option value="">
                  All types
                </option>
                <option
                  v-for="t in allTypes"
                  :key="String(t)"
                  :value="String(t)"
                >
                  {{ t }}
                </option>
              </select>
            </div>
            <input
              v-model="startDateText"
              type="datetime-local"
              class="px-3 py-2 rounded bg-white/5 border border-white/10 w-full"
            >
            <input
              v-model="endDateText"
              type="datetime-local"
              class="px-3 py-2 rounded bg-white/5 border border-white/10 w-full"
            >
          </div>
          <div class="flex items-center gap-2 mb-3">
            <button
              class="px-3 py-2 rounded bg-white/10 border border-white/20"
              @click="loadLogs"
            >
              Refresh
            </button>
            <div class="ml-2 flex items-center gap-2 text-white/80">
              <button
                class="px-2 py-1 rounded bg-white/6"
                :disabled="logsPage<=1"
                @click="loadPrevPage"
              >
                Prev
              </button>
              <div>Page {{ logsPage }} / {{ Math.max(1, Math.ceil((logsTotal || 0) / logsPerPage)) }}</div>
              <button
                class="px-2 py-1 rounded bg-white/6"
                :disabled="logsPage >= Math.max(1, Math.ceil((logsTotal || 0) / logsPerPage))"
                @click="loadNextPage"
              >
                Next
              </button>
            </div>
            <div class="ml-auto flex items-center gap-2">
              <div class="text-sm text-white/70">
                Per page
              </div>
              <select
                v-model.number="logsPerPage"
                class="px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
                @change="logsPage=1; loadLogs()"
              >
                <option :value="5">
                  5
                </option>
                <option :value="10">
                  10
                </option>
                <option :value="25">
                  25
                </option>
                <option :value="50">
                  50
                </option>
                <option :value="100">
                  100
                </option>
              </select>
              <button
                class="px-3 py-2 rounded bg-white/10 border border-white/20"
                @click="exportCsv"
              >
                Export CSV
              </button>
            </div>
          </div>
          <div
            v-if="!logs.length"
            class="text-white/60"
          >
            No logs yet.
          </div>
          <ul
            v-else
            class="space-y-1"
          >
            <li
              v-for="(e, i) in filteredLogs"
              :key="i"
              class="p-2 rounded bg-white/5 border border-white/10"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="text-xs text-white/70">
                  {{ fmt(e.ts) }}
                </div>
                <div class="flex items-center gap-2">
                  <div class="text-[11px] px-1.5 py-0.5 rounded bg-white/10 border border-white/20">
                    {{ e.type }}
                  </div>
                  <div
                    v-if="e.by"
                    class="text-xs text-white/70"
                  >
                    by {{ e.by }}
                  </div>
                </div>
              </div>
              <div class="mt-1 text-sm truncate">
                <span
                  v-if="e.scope && e.scope.equipmentTag"
                  class="text-white/80"
                >{{ e.scope.equipmentTag }}</span>
                <span
                  v-else-if="e.scope && e.scope.equipmentId"
                  class="text-white/70"
                >Eq#{{ e.scope.equipmentId }}</span>
                <span
                  v-if="e.section && (e.section.number || e.section.title)"
                  class="text-white/60"
                > • Sec {{ e.section.number }} {{ e.section.title ? '– ' + e.section.title : '' }}</span>
                <span
                  v-if="e.question && (e.question.number || e.question.text)"
                  class="text-white/60"
                > • Q{{ e.question.number }} {{ e.question.text ? '– ' + e.question.text : '' }}</span>
                <span
                  v-if="!e.by"
                  class="text-white/60"
                >&nbsp;</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div class="mt-6 text-right">
        <button
          :disabled="saving"
          class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 inline-flex items-center gap-2"
          :class="saving ? 'opacity-60 cursor-not-allowed' : ''"
          @click="save"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            class="w-4 h-4"
          >
            <path
              d="M5 13l4 4L19 7"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Save</span>
        </button>
      </div>
    </div>
    <!-- Role Template editor modal -->
    <Modal
      v-model="showRoleModal"
      panel-class="max-w-[720px]"
    >
      <template #header>
        <div class="font-medium text-white">
          {{ editingRoleTemplate && editingRoleTemplate._id ? 'Edit Role Template' : 'Create Role Template' }}
        </div>
      </template>

      <div class="mb-3 text-sm text-white/80">
        <label class="block mb-1">Name</label>
        <input
          v-model="editingRoleTemplate.name"
          class="w-full p-2 rounded bg-white/5 border border-white/10"
        >
      </div>
      <div class="mb-3 text-sm text-white/80">
        <label class="block mb-1">Description</label>
        <input
          v-model="editingRoleTemplate.description"
          class="w-full p-2 rounded bg-white/5 border border-white/10"
        >
      </div>
      <div class="mb-3 text-sm text-white/80">
        <label class="block mb-1">Permissions</label>
        <div class="grid grid-cols-2 gap-3 max-h-[340px] overflow-auto mb-3">
          <div
            v-for="(ops, resource) in permMatrix"
            :key="resource"
            class="p-3 rounded bg-white/5"
          >
            <div class="font-medium mb-2">
              {{ permResourceLabel(resource) }}
            </div>
            <div class="grid grid-cols-4 gap-2 text-sm">
              <label
                v-for="op in ops"
                :key="op"
                class="inline-flex items-center gap-2"
              >
                <input
                  v-model="selectedRolePermsArray"
                  type="checkbox"
                  :value="`${resource}.${op}`"
                >
                <span class="capitalize">{{ op }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="mt-3 text-right w-full">
          <button
            v-if="editingRoleTemplate && editingRoleTemplate._id"
            class="px-3 py-1 rounded bg-red-500/20 text-red-400 mr-2"
            @click="deleteRoleTemplate(editingRoleTemplate)"
          >
            Delete
          </button>
          <button
            class="px-3 py-1 rounded bg-white/6 text-white/80 hover:text-white mr-2"
            @click="closeRoleModal"
          >
            Cancel
          </button>
          <button
            class="px-3 py-1 rounded bg-emerald-500 text-white"
            @click="saveRoleTemplate"
          >
            Save
          </button>
        </div>
      </template>
    </Modal>
    <Modal
      v-model="showEditMemberModal"
      panel-class="max-w-md"
    >
      <template #header>
        <div class="text-lg font-medium">
          Edit member
        </div>
      </template>

      <div class="grid grid-cols-1 gap-3">
        <div class="grid grid-cols-2 gap-2">
          <input
            v-model="editMemberForm.firstName"
            placeholder="First name"
            class="rounded p-2 bg-white/5 w-full text-white/90 placeholder-white/50"
          >
          <input
            v-model="editMemberForm.lastName"
            placeholder="Last name"
            class="rounded p-2 bg-white/5 w-full text-white/90 placeholder-white/50"
          >
        </div>
        <input
          v-model="editMemberForm.email"
          placeholder="Email"
          class="rounded p-2 bg-white/5 w-full text-white/90 placeholder-white/50"
        >
        <input
          v-model="editMemberForm.company"
          placeholder="Company"
          class="rounded p-2 bg-white/5 w-full text-white/90 placeholder-white/50"
        >
        <select
          v-model="editMemberForm.role"
          class="rounded p-2 bg-white/5 w-full text-white/90"
        >
          <option
            v-for="opt in assignableRoleOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.text }}
          </option>
        </select>
      </div>

      <template #footer>
        <div class="mt-3 text-right w-full">
          <button
            class="px-3 py-1 rounded bg-white/6 mr-2 text-white/80 hover:text-white/90"
            @click="closeEditMember"
          >
            Cancel
          </button>
          <button
            class="px-3 py-1 rounded bg-emerald-500 text-white"
            @click="saveEditedMember"
          >
            Save
          </button>
        </div>
      </template>
    </Modal>
    <PermissionsModal
      v-if="showPermsModal && modalMember"
      :visible="showPermsModal"
      :member="modalMember"
      :project-id="projectIdString"
      :role-templates="displayedRoleTemplates"
      @close="closePermsModal"
      @saved="onMemberPermissionsSaved"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import lists from '../../lists.js'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import ProjectForm from '../../components/ProjectForm.vue'
import Modal from '../../components/Modal.vue'
import { useUiStore } from '../../stores/ui'
import { useProjectStore, fetchBillingSummary, previewPlanChange, changePlan, cancelSubscription, resumeSubscription, changeBillingAdmin, createSetupIntent, updatePaymentMethod, listPaymentMethods, detachPaymentMethod } from '../../stores/project'
import { useRoute, useRouter } from 'vue-router'
import http from '../../utils/http'
import { apiUrl, getApiBase } from '../../utils/api'
import { getAuthHeaders } from '../../utils/auth'
import PermissionsModal from '../../components/PermissionsModal.vue'
import BillingCardForm from '../../components/BillingCardForm.vue'
import Spinner from '../../components/Spinner.vue'
// inlineConfirm removed (unused in this file)

const projectStore = useProjectStore()
const route = useRoute()
const router = useRouter()

type StripePrice = {
  id?: string
  priceId?: string
  key?: string
  name?: string
  label?: string
}

const projectId = route.params.id || route.query.id || null
const projectIdString = computed(() => {
  const v: any = projectId
  if (Array.isArray(v)) return String(v[0] || '')
  return v ? String(v) : ''
})
const project = ref<any>(null)
const activeTab = ref('info')
const logs = ref<any[]>([])
const logsSearch = ref('')
const selectedType = ref('')
const startDateText = ref('')
const endDateText = ref('')
const logsPerPage = ref(10)
const logsPage = ref(1)
const logsTotal = ref(0)
const formErrors = ref<Record<string, any>>({})
const ui = useUiStore()
const clientFileInput = ref<HTMLInputElement | null>(null)
const cxaFileInput = ref<HTMLInputElement | null>(null)
const newMember = ref({ email: '', firstName: '', lastName: '', company: '', role: 'User' })
const invites = ref<any[]>([])
// track which invite ids are currently being resent
const loadingInviteIds = ref<string[]>([])
const roleTemplates = ref<any[]>([])
// Dedicated UI list that always preserves all visible roles
const roleTemplatesView = ref<any[]>([])

const seedRoleTemplatesBusy = ref(false)

// Transactions (invoices/charges) UI state
const transactions = ref<any[]>([])
// Feature upgrade prompt from router redirect
const upgradeFeature = computed(() => {
  const q = String(route.query.upgrade || '').toLowerCase()
  return q && ['spaces','equipment','templates','activities','issues','tasks','ai'].includes(q) ? q : ''
})

function setActiveTabFromQuery() {
  const t = String(route.query.tab || '').trim().toLowerCase()
  if (!t) return
  const allowed = ['info', 'team', 'logo', 'subscription', 'settings', 'logs']
  if (allowed.includes(t)) activeTab.value = t
}

watch(() => route.query.tab, () => {
  setActiveTabFromQuery()
})

// Recommend a plan for a given feature (simple mapping; adjust as needed)
function recommendPlanForFeature(f: string) {
  const key = String(f || '').toLowerCase()
  if (key === 'ai') return 'premium'
  // For heavier features like templates and activities, recommend standard; for all others, basic
  const recommendedTier = (key === 'templates' || key === 'activities') ? 'standard' : 'basic'
  // Try to resolve to a concrete price id from loaded prices
  const byKey = (prices.value || []).find((p: StripePrice) => String(p.key || '') === recommendedTier)
  if (byKey) return String(byKey.id)
  // Fallback: look for a price with matching label/name
  const byName = (prices.value || []).find((p: StripePrice) => String(p.name || p.label || '').toLowerCase().includes(recommendedTier))
  if (byName) return String(byName.id)
  // As last resort, pick first available
  return prices.value && prices.value.length ? String(prices.value[0].id) : ''
}

// When upgrade feature is present, preselect a recommended plan
watch(upgradeFeature, (feat) => {
  if (!feat) return
  const rec = recommendPlanForFeature(feat)
  if (rec) selectedPrice.value = rec
})
const transactionsPage = ref(1)
const transactionsPerPage = ref(10)
const transactionsTotal = ref(0)
const transactionsLoading = ref(false)
const transactionsStatus = ref('all')
const transactionsType = ref('all')
const transactionsStart = ref('')
const transactionsEnd = ref('')
const transactionsWarning = ref<string | null>(null)
const billingSummary = ref<any | null>(null)
const billingLoading = ref(false)
const billingError = ref<string | null>(null)
const planPreview = ref<any | null>(null)
const planPreviewLoading = ref(false)
const planChangeLoading = ref(false)
const cancelLoading = ref(false)
const resumeLoading = ref(false)
const paymentMethodId = ref('')
const paymentMethodLoading = ref(false)
const billingAdminUserId = ref<string | null>(null)
const billingAdminLoading = ref(false)
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_PUBLIC_KEY || ''
const cardSetupClientSecret = ref<string | null>(null)
const showCardForm = ref(false)
const showManualPm = ref(false)
const paymentMethods = ref<any[]>([])
const paymentMethodsLoading = ref(false)
const paymentMethodsError = ref<string | null>(null)
const promotionCode = ref('')
const applyingPromotion = ref(false)
const reconcileLoading = ref(false)

async function loadTransactions() {
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id))
    if (!pid) return
    transactionsLoading.value = true
    transactionsWarning.value = null
    const params: any = {
      page: transactionsPage.value,
      limit: transactionsPerPage.value,
    }
    if (transactionsStatus.value && transactionsStatus.value !== 'all') params.status = transactionsStatus.value
    if (transactionsType.value && transactionsType.value !== 'all') params.type = transactionsType.value
    if (transactionsStart.value) params.start = transactionsStart.value
    if (transactionsEnd.value) params.end = transactionsEnd.value
    const res = await http.get(`/api/stripe/project/${pid}/transactions`, { params, headers: getAuthHeaders() })
    const data = res.data || { items: [], total: 0 }
    transactions.value = Array.isArray(data.items) ? data.items : []
    transactionsTotal.value = Number(data.total || 0)
    transactionsWarning.value = typeof data.warning === 'string' ? data.warning : null
  } catch (e) {
    console.error('loadTransactions err', e)
    transactions.value = []
    transactionsTotal.value = 0
    transactionsWarning.value = null
  } finally {
    transactionsLoading.value = false
  }
}

function txnPrevPage() { if (transactionsPage.value > 1) { transactionsPage.value -= 1; loadTransactions() } }
function txnNextPage() { const tot = Math.max(1, Math.ceil((transactionsTotal.value || 0) / transactionsPerPage.value)); if (transactionsPage.value < tot) { transactionsPage.value += 1; loadTransactions() } }
function exportTransactionsCsv() {
  const pid = projectId || (project.value && (project.value._id || project.value.id))
  if (!pid) return
  const params = new URLSearchParams()
  params.set('page', String(transactionsPage.value))
  params.set('limit', String(transactionsPerPage.value))
  params.set('format', 'csv')
  if (transactionsStatus.value && transactionsStatus.value !== 'all') params.set('status', transactionsStatus.value)
  if (transactionsType.value && transactionsType.value !== 'all') params.set('type', transactionsType.value)
  if (transactionsStart.value) params.set('start', transactionsStart.value)
  if (transactionsEnd.value) params.set('end', transactionsEnd.value)
  const url = `${apiUrl()}/api/stripe/project/${pid}/transactions?${params.toString()}`
  window.open(url, '_blank')
}
const authStore = useAuthStore()

const crumbs = computed(() => {
  const pid = String(projectId || (project.value && ((project.value as any)._id || (project.value as any).id)) || '')
  const name = String((project.value && (project.value as any).name) || '').trim()
  return [
    { text: 'Dashboard', to: '/' },
    { text: name || 'Project Settings', to: pid ? `/projects/edit/${pid}` : '/projects' },
  ]
})

async function loadBillingSummary() {
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id))
    if (!pid) return
    billingLoading.value = true
    billingError.value = null
    const data = await fetchBillingSummary(String(pid))
    billingSummary.value = data
    if (data && data.priceId) selectedPrice.value = data.priceId
    // Pre-fill billing admin select with current admin, matching team member id or email
    if (data && data.billingAdmin) {
      const currentUid = String(data.billingAdmin.userId || '')
      const currentEmail = String(data.billingAdmin.email || '')
      const team = billingAdminOptions.value || []
      const byId = currentUid ? team.find((m: any) => String(m._id) === currentUid) : null
      const byEmail = currentEmail ? team.find((m: any) => String(m.email) === currentEmail) : null
      if (byId && byId._id) {
        billingAdminUserId.value = String(byId._id)
      } else if (byEmail && byEmail.email) {
        billingAdminUserId.value = String(byEmail.email)
      } else if (currentUid) {
        billingAdminUserId.value = currentUid
      } else if (currentEmail) {
        billingAdminUserId.value = currentEmail
      }
    }
    await loadPaymentMethods()
  } catch (e) {
    console.error('loadBillingSummary err', e)
    billingError.value = 'Failed to load billing summary'
  } finally {
    billingLoading.value = false
  }
}

async function handlePreviewPlan() {
  try {
    if (!selectedPrice.value) return
    planPreviewLoading.value = true
    const priceId = resolvePriceId(String(selectedPrice.value))
    planPreview.value = await previewPlanChange(String(projectId || project.value?.id || project.value?._id), String(priceId))
    try {
      if (planPreview.value) {
        ui.showSuccess('Preview loaded. Plan change may prorate the current invoice.')
      }
    } catch (_) { /* ignore toast errors */ }
  } catch (e) {
    console.error('preview plan err', e)
    // Surface backend error when available (e.g., Stripe not configured, unauthorized, no subscription)
    // This helps diagnose production vs local environment discrepancies.
    const anyErr = e as any
    const msg = (anyErr && anyErr.response && anyErr.response.data && (anyErr.response.data.error || anyErr.response.data.message)) || (anyErr && anyErr.message) || 'Failed to preview plan change'
    ui.showError(String(msg))
  } finally {
    planPreviewLoading.value = false
  }
}

async function handleChangePlan() {
  try {
    if (!selectedPrice.value) return
    planChangeLoading.value = true
    const priceId = resolvePriceId(String(selectedPrice.value))
    // Guardrail: if selection matches current priceId, avoid redundant change
    const currentId = String(billingSummary.value?.priceId || project.value?.stripePriceId || '')
    if (currentId && currentId === priceId) {
      ui.showError('Selected plan is already active')
      return
    }
    await changePlan(String(projectId || project.value?.id || project.value?._id), String(priceId))
    ui.showSuccess('Plan updated')
    await refreshProject()
    await loadBillingSummary()
  } catch (e: any) {
    console.error('change plan err', e)
    ui.showError(e?.response?.data?.error || 'Failed to change plan')
  } finally {
    planChangeLoading.value = false
  }
}

// Reset project subscription features to current plan defaults by re-applying the same plan price
async function resetFeaturesToPlanDefaults() {
  try {
    const pid = String(projectId || project.value?.id || project.value?._id)
    if (!pid) return
    const priceId = String(billingSummary.value?.priceId || project.value?.stripePriceId || selectedPrice.value || '')
    if (!priceId) {
      ui.showError('No active plan to reset features from')
      return
    }
    planChangeLoading.value = true
    await changePlan(pid, priceId)
    ui.showSuccess('Features reset to plan defaults')
    await refreshProject()
    await loadBillingSummary()
  } catch (e: any) {
    console.error('reset features err', e)
    ui.showError(e?.response?.data?.error || 'Failed to reset features')
  } finally {
    planChangeLoading.value = false
  }
}

async function handleCancel(atPeriodEnd = true) {
  try {
    cancelLoading.value = true
    await cancelSubscription(String(projectId || project.value?.id || project.value?._id), atPeriodEnd)
    ui.showSuccess(atPeriodEnd ? 'Will cancel at period end' : 'Subscription canceled')
    await refreshProject()
    await loadBillingSummary()
  } catch (e: any) {
    console.error('cancel err', e)
    ui.showError(e?.response?.data?.error || 'Failed to cancel subscription')
  } finally {
    cancelLoading.value = false
  }
}

async function handleResume() {
  try {
    resumeLoading.value = true
    await resumeSubscription(String(projectId || project.value?.id || project.value?._id))
    ui.showSuccess('Cancellation removed')
    await refreshProject()
    await loadBillingSummary()
  } catch (e: any) {
    console.error('resume err', e)
    ui.showError(e?.response?.data?.error || 'Failed to resume subscription')
  } finally {
    resumeLoading.value = false
  }
}

async function handleChangeBillingAdmin() {
  try {
    if (!billingAdminUserId.value) return
    billingAdminLoading.value = true
    const member = billingAdminOptions.value.find((m: any) => String(m._id) === String(billingAdminUserId.value) || m.email === billingAdminUserId.value)
    await changeBillingAdmin(
      String(projectId || project.value?.id || project.value?._id),
      member ? { userId: member._id, email: member.email } : { userId: String(billingAdminUserId.value), email: billingAdminUserId.value }
    )
    ui.showSuccess('Billing admin updated')
    await refreshProject()
    await loadBillingSummary()
  } catch (e: any) {
    console.error('billing admin change err', e)
    ui.showError(e?.response?.data?.error || 'Failed to update billing admin')
  } finally {
    billingAdminLoading.value = false
  }
}

async function handleSetupIntent() {
  try {
    if (!stripePublishableKey) {
      ui.showError('Stripe publishable key missing (VITE_STRIPE_PUBLISHABLE_KEY)')
      return
    }
    paymentMethodLoading.value = true
    const data = await createSetupIntent(String(projectId || project.value?.id || project.value?._id))
    cardSetupClientSecret.value = data?.client_secret || null
    if (!cardSetupClientSecret.value) {
      ui.showError('Setup intent missing client secret')
      return
    }
    showCardForm.value = true
    ui.showInfo('Enter card details and click Save card')
  } catch (e: any) {
    console.error('setup intent err', e)
    ui.showError(e?.response?.data?.error || 'Failed to create setup intent')
  } finally {
    paymentMethodLoading.value = false
  }
}

async function handleCardSaved(pmId: string) {
  try {
    await updatePaymentMethod(String(projectId || project.value?.id || project.value?._id), pmId)
    ui.showSuccess('Payment method saved')
    paymentMethodId.value = ''
    cardSetupClientSecret.value = null
    showCardForm.value = false
    await refreshProject()
    await loadBillingSummary()
  } catch (e: any) {
    console.error('update PM err', e)
    ui.showError(e?.response?.data?.error || 'Failed to update payment method')
  }
}

function handleCardError(msg: string) {
  if (msg) ui.showError(msg)
}

function handleCardCancel() {
  cardSetupClientSecret.value = null
  showCardForm.value = false
}

async function handleUpdatePaymentMethod() {
  try {
    if (!paymentMethodId.value) {
      ui.showError('Enter a payment method ID')
      return
    }
    paymentMethodLoading.value = true
    await updatePaymentMethod(String(projectId || project.value?.id || project.value?._id), paymentMethodId.value)
    ui.showSuccess('Payment method updated')
    paymentMethodId.value = ''
    await loadPaymentMethods()
    await refreshProject()
    await loadBillingSummary()
  } catch (e: any) {
    console.error('update PM err', e)
    ui.showError(e?.response?.data?.error || 'Failed to update payment method')
  } finally {
    paymentMethodLoading.value = false
  }
}

async function handleReconcileSubscription() {
  try {
    const pid = String(projectId || project.value?.id || (project.value as any)?._id || '')
    if (!pid) return
    reconcileLoading.value = true
    await http.post(`/api/stripe/project/${pid}/reconcile-subscription`, {}, { headers: getAuthHeaders() })
    ui.showSuccess('Subscription link reconciled')
    await refreshProject()
    await loadBillingSummary()
  } catch (e: any) {
    console.error('reconcile-subscription err', e)
    const msg = (e && e.response && e.response.data && (e.response.data.error || e.response.data.message)) || e?.message || 'Failed to reconcile subscription'
    ui.showError(String(msg))
  } finally {
    reconcileLoading.value = false
  }
}

async function makeDefaultFromList(pmId: string) {
  try {
    paymentMethodLoading.value = true
    await updatePaymentMethod(String(projectId || project.value?.id || project.value?._id), pmId)
    ui.showSuccess('Default payment method updated')
    await loadPaymentMethods()
    await refreshProject()
    await loadBillingSummary()
  } catch (e: any) {
    console.error('make default err', e)
    ui.showError(e?.response?.data?.error || 'Failed to update default payment method')
  } finally {
    paymentMethodLoading.value = false
  }
}

async function applyPromotionToSubscription() {
  try {
    if (!promotionCode.value) {
      ui.showError('Enter a promotion code')
      return
    }
    applyingPromotion.value = true
    const pid = projectId || (project.value && (project.value._id || project.value.id))
    if (!pid) throw new Error('No project selected')
    await http.post(`/api/stripe/project/${pid}/promotion`, { code: promotionCode.value }, { headers: getAuthHeaders() })
    ui.showSuccess('Promotion applied')
    await refreshProject()
    await loadBillingSummary()
  } catch (e: any) {
    console.error('apply promo err', e)
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to apply promotion')
  } finally {
    applyingPromotion.value = false
  }
}

async function loadPaymentMethods() {
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id))
    if (!pid) return
    paymentMethodsLoading.value = true
    paymentMethodsError.value = null
    const data = await listPaymentMethods(String(pid))
    paymentMethods.value = Array.isArray(data?.items) ? data.items : []
  } catch (e) {
    console.error('loadPaymentMethods err', e)
    paymentMethodsError.value = 'Failed to load payment methods'
    paymentMethods.value = []
  } finally {
    paymentMethodsLoading.value = false
  }
}

async function handleDetach(pmId: string) {
  try {
    if (paymentMethods.value && paymentMethods.value.length <= 1) {
      ui.showError('Cannot remove the only saved payment method')
      return
    }
    if (typeof window !== 'undefined') {
      const ok = window.confirm('Remove this payment method?')
      if (!ok) return
    }
    paymentMethodsLoading.value = true
    await detachPaymentMethod(String(projectId || project.value?.id || project.value?._id), pmId)
    ui.showSuccess('Payment method removed')
    await loadPaymentMethods()
    await refreshProject()
    await loadBillingSummary()
  } catch (e: any) {
    console.error('detach PM err', e)
    ui.showError(e?.response?.data?.error || 'Failed to detach payment method')
  } finally {
    paymentMethodsLoading.value = false
  }
}

// Modal-based permissions editor state & handlers
const showPermsModal = ref(false)
const modalMember = ref<any | null>(null)

function openPermsModal(member: any) {
  modalMember.value = member
  showPermsModal.value = true
}

function closePermsModal() {
  modalMember.value = null
  showPermsModal.value = false
}

// Modal-based member editor state & handlers
const showEditMemberModal = ref(false)
const editingMember = ref<any | null>(null)
const editMemberForm = ref({ firstName: '', lastName: '', email: '', company: '', role: '' })

function openEditMember(member: any) {
  editingMember.value = member
  editMemberForm.value = {
    firstName: member.firstName || '',
    lastName: member.lastName || '',
    email: member.email || '',
    company: member.company || '',
    role: member.role || ''
  }
  showEditMemberModal.value = true
}

function closeEditMember() {
  editingMember.value = null
  editMemberForm.value = { firstName: '', lastName: '', email: '', company: '', role: '' }
  showEditMemberModal.value = false
}

async function saveEditedMember() {
  if (!editingMember.value) return
  try {
    // Update the local project.team entry and persist project
    const idOrEmail = editingMember.value._id || editingMember.value.email
    const list = Array.isArray(project.value.team) ? project.value.team.slice() : []
    const idx = list.findIndex((m: any) => ((m._id || m.email) === idOrEmail))
    const updated = { ...list[idx], ...editMemberForm.value }
    if (idx >= 0) list.splice(idx, 1, updated)
    else list.push(updated)
    project.value = { ...project.value, team: list }
    await projectStore.updateProject(project.value)
    ui.showSuccess('Member updated')
    closeEditMember()
  } catch (err: any) {
    console.error('saveEditedMember error', err)
    ui.showError(err?.response?.data?.error || 'Failed to save member')
  }
}

async function onMemberPermissionsSaved(updatedMember: any) {
  try {
    if (updatedMember && project.value && Array.isArray(project.value.team)) {
      const idOrEmail = updatedMember._id || updatedMember.email
      const idx = project.value.team.findIndex((m: any) => ((m._id || m.email) === idOrEmail))
      if (idx >= 0) {
        // Merge to preserve local fields and ensure reactivity
        const merged = { ...project.value.team[idx], ...updatedMember }
        const list = project.value.team.slice()
        list.splice(idx, 1, merged)
        project.value = { ...project.value, team: list }
      }
    } else {
      // Fallback: refresh full project
      try { await refreshProject() } catch (e) { /* ignore */ }
    }
    ui.showSuccess('Member permissions updated')
  } catch (err) {
    console.error('onMemberPermissionsSaved error', err)
  }
  closePermsModal()
}

// Role template editor modal state & handlers
const showRoleModal = ref(false)
type RoleTemplateDraft = { _id?: string; name: string; description: string; permissionsText: string }
const editingRoleTemplate = ref<RoleTemplateDraft>({ name: '', description: '', permissionsText: '' })
const selectedRolePerms = ref<Set<string>>(new Set())
const permResourceLabels: Record<string, string> = {
  documents: 'Documents (files)',
  folders: 'Folders',
}

function permResourceLabel(resource: string) {
  return permResourceLabels[resource] || resource
}

const permMatrix = {
  tasks: ['create', 'read', 'update', 'delete'],
  issues: ['create', 'read', 'update', 'delete'],
  activities: ['create', 'read', 'update', 'delete'],
  equipment: ['create', 'read', 'update', 'delete'],
  'equipment.checklists': ['create', 'read', 'update', 'delete'],
  'equipment.functionalTests': ['create', 'read', 'update', 'delete'],
  documents: ['create', 'read', 'update', 'delete'],
  folders: ['create', 'read', 'update', 'delete'],
  templates: ['create', 'read', 'update', 'delete'],
  spaces: ['create', 'read', 'update', 'delete'],
  projects: ['update', 'delete'],
  'projects.users': ['manage'],
  'projects.roles': ['manage'],
}

// Accordion state for role templates in the Settings card
const openRoles = ref<Set<string>>(new Set())

// Collapsible state for the Roles card
const rolesOpen = ref(false)

// Collapsible state for the AI card
const aiOpen = ref(false)

// Collapsible state for the Project Tags section
const projectTagsOpen = ref(false)

// Collapsible state for Search mode + Issues per page
const searchIssuesOpen = ref(false)

function toggleAiOpen() {
  aiOpen.value = !aiOpen.value
}

function toggleProjectTagsOpen() {
  projectTagsOpen.value = !projectTagsOpen.value
}

function toggleSearchIssuesOpen() {
  searchIssuesOpen.value = !searchIssuesOpen.value
}

function toggleRolesOpen() {
  rolesOpen.value = !rolesOpen.value
}

const selectedRolePermsArray = computed({
  get() { return Array.from(selectedRolePerms.value) },
  set(v) { selectedRolePerms.value = new Set(Array.isArray(v) ? v : []) }
})

// Inline editing state for role templates
const roleEdits = ref<Record<string, Set<string>>>({}) // map roleId -> Set

function getTemplateById(id: string) {
  try {
    const list = displayedRoleTemplates.value || []
    return list.find((r: any) => (r && ((r._id || r.id) === id))) || null
  } catch (e) { return null }
}

function toggleRoleOpen(id: string) {
  try {
    if (!id) return
    const s = new Set(openRoles.value)
    if (s.has(id)) {
      s.delete(id)
    } else {
      s.add(id)
      // initialize edits snapshot when opening
      if (!roleEdits.value[id]) {
        const tpl = getTemplateById(id)
        const perms = Array.isArray(tpl?.permissions) ? tpl.permissions : []
        roleEdits.value = Object.assign({}, roleEdits.value, { [id]: new Set(perms) })
      }
    }
    openRoles.value = s
  } catch (e) { /* ignore */ }
}

function isRoleOpen(id: string) {
  try { return openRoles.value.has(id) } catch (e) { return false }
}

function isPermChecked(roleId: string, perm: string) {
  try {
    const s = roleEdits.value[roleId]
    if (s) return s.has(perm)
    const tpl = getTemplateById(roleId)
    return Array.isArray(tpl?.permissions) && tpl.permissions.includes(perm)
  } catch (e) { return false }
}

function togglePerm(roleId: string, perm: string) {
  try {
    const current = roleEdits.value[roleId] || new Set()
    const s = new Set(current)
    if (s.has(perm)) s.delete(perm)
    else s.add(perm)
    roleEdits.value = Object.assign({}, roleEdits.value, { [roleId]: s })
  } catch (e) { /* ignore */ }
}

function hasRoleChanges(roleId: string, tpl: any) {
  try {
    const s = roleEdits.value[roleId]
    if (!s) return false
    const orig = Array.isArray(tpl?.permissions) ? tpl.permissions : []
    const a = Array.from(s).sort()
    const b = Array.from(new Set(orig)).sort()
    return JSON.stringify(a) !== JSON.stringify(b)
  } catch (e) { return false }
}

function cancelRoleEdits(roleId: string, tpl: any) {
  try {
    const perms = Array.isArray(tpl?.permissions) ? tpl.permissions : []
    roleEdits.value = Object.assign({}, roleEdits.value, { [roleId]: new Set(perms) })
  } catch (e) { /* ignore */ }
}

async function saveRoleInline(tpl: any) {
  try {
    const id = tpl._id || tpl.id
    const pid = projectId || (project.value && (project.value._id || project.value.id))
    if (!id || !pid) return ui.showError('Missing project or role id')
    const perms = Array.from(roleEdits.value[id] || [])
    const body = { permissions: perms }
    
    const resp = await http.put(`/api/projects/${pid}/roles/${id}`, body, { headers: getAuthHeaders() })
    ui.showSuccess('Role template updated')
    // update local template
    try {
      // Handle different possible response structures
      let updated = null
      if (resp && resp.data) {
        // Check for nested roleTemplate object first
        updated = resp.data.roleTemplate || 
                 // Check if the response data itself is the role template
                 (resp.data._id || resp.data.id ? resp.data : null) ||
                 // Handle array response
                 (Array.isArray(resp.data) && resp.data.length > 0 ? resp.data[0] : null)
      }
      
      if (updated && project.value) {
        // Build from the current UI list to preserve all items
        const list = Array.isArray(roleTemplatesView.value) && roleTemplatesView.value.length
          ? [...roleTemplatesView.value]
          : (project.value && Array.isArray(project.value.roleTemplates) && project.value.roleTemplates.length
            ? [...project.value.roleTemplates]
            : (Array.isArray(roleTemplates.value) ? [...roleTemplates.value] : []))

        // Update the specific role in the complete list
        const idx = list.findIndex(r => (r && ((r._id || r.id) === id)))
        if (idx >= 0) {
          list[idx] = updated
        } else {
          list.unshift(updated)
        }

        // Update project and the stable UI list with the complete roles
        project.value = { ...project.value, roleTemplates: list }
        roleTemplatesView.value = list
      }
      if (updated && Array.isArray(roleTemplates.value)) {
        const g = [...roleTemplates.value]
        const gi = g.findIndex(r => (r && ((r._id || r.id) === id)))
        if (gi >= 0) {
          g.splice(gi, 1, updated)
        } else {
          g.unshift(updated)
        }
        roleTemplates.value = g
      }
    } catch (e) { 
      console.warn('Local role template inline update failed:', e)
    }
    // Refresh project to ensure full, authoritative role list is shown after inline save
    try { await refreshProject() } catch (e) { /* ignore */ }
  } catch (err: any) {
    console.error('saveRoleInline error', err)
    ui.showError(err?.response?.data?.error || 'Failed to save role')
  }
}

function openRoleModal(template: any) {
  if (template && (template._id || template.id)) {
    // editing existing
    editingRoleTemplate.value = {
      _id: template._id || template.id,
      name: template.name || '',
      description: template.description || '',
      permissionsText: Array.isArray(template.permissions) ? template.permissions.join('\n') : ''
    }
    // initialize selectedRolePerms from template
    selectedRolePerms.value = new Set(Array.isArray(template.permissions) ? template.permissions : [])
  } else {
    editingRoleTemplate.value = { name: '', description: '', permissionsText: '' }
    selectedRolePerms.value = new Set()
  }
  showRoleModal.value = true
}

function closeRoleModal() {
  showRoleModal.value = false
}

async function saveRoleTemplate() {
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id))
    if (!pid) return ui.showError('No project selected')
    const body = {
      name: editingRoleTemplate.value.name || '',
      description: editingRoleTemplate.value.description || '',
      permissions: Array.from(selectedRolePerms.value)
    }
    if (editingRoleTemplate.value._id) {
      const resp = await http.put(`/api/projects/${pid}/roles/${editingRoleTemplate.value._id}`, body, { headers: getAuthHeaders() })
      ui.showSuccess('Role template updated')
      // Update local project roleTemplates so the UI reflects changes immediately
      try {
        // Handle different possible response structures
        let updated = null
        if (resp && resp.data) {
          // Check for nested roleTemplate object first
          updated = resp.data.roleTemplate || 
                   // Check if the response data itself is the role template
                   (resp.data._id || resp.data.id ? resp.data : null) ||
                   // Handle array response
                   (Array.isArray(resp.data) && resp.data.length > 0 ? resp.data[0] : null)
        }
        
        if (updated) {
          // Build from the current UI list to preserve all items
          const list = Array.isArray(roleTemplatesView.value) && roleTemplatesView.value.length
            ? [...roleTemplatesView.value]
            : (project.value && Array.isArray(project.value.roleTemplates) && project.value.roleTemplates.length
              ? [...project.value.roleTemplates]
              : (Array.isArray(roleTemplates.value) ? [...roleTemplates.value] : []))
          const idx = list.findIndex(r => (r && ((r._id || r.id) === (updated._id || updated.id))))
          if (idx >= 0) {
            // Replace the existing role
            list.splice(idx, 1, updated)
          } else {
            // Add the new role
            list.push(updated)
          }
          // Force reactive update by creating new reference
          if (project.value) {
            project.value = { ...project.value, roleTemplates: list }
          }
          // Update the stable UI list
          roleTemplatesView.value = list
          
          // Also update global roleTemplates array for consistency
          const globalList = Array.isArray(roleTemplates.value) ? [...roleTemplates.value] : []
          const globalIdx = globalList.findIndex(r => (r && ((r._id || r.id) === (updated._id || updated.id))))
          if (globalIdx >= 0) {
            globalList.splice(globalIdx, 1, updated)
          } else {
            globalList.push(updated)
          }
          roleTemplates.value = globalList
        }
      } catch (e) { 
        console.warn('Local role template update failed:', e)
      }
    } else {
      const resp = await http.post(`/api/projects/${pid}/roles`, body, { headers: getAuthHeaders() })
      ui.showSuccess('Role template created')
      // Insert created role into local project roleTemplates so it shows immediately
      try {
        // Handle different possible response structures
        let created = null
        if (resp && resp.data) {
          // Check for nested roleTemplate object first
          created = resp.data.roleTemplate || 
                   // Check if the response data itself is the role template
                   (resp.data._id || resp.data.id ? resp.data : null) ||
                   // Handle array response
                   (Array.isArray(resp.data) && resp.data.length > 0 ? resp.data[0] : null)
        }
        
        if (created) {
          // Build from the current UI list to preserve all items
          const list = Array.isArray(roleTemplatesView.value) && roleTemplatesView.value.length
            ? [...roleTemplatesView.value]
            : (project.value && Array.isArray(project.value.roleTemplates) && project.value.roleTemplates.length
              ? [...project.value.roleTemplates]
              : (Array.isArray(roleTemplates.value) ? [...roleTemplates.value] : []))
          // Add the new role at the beginning
          list.unshift(created)
          // Force reactive update by creating new reference
          if (project.value) {
            project.value = { ...project.value, roleTemplates: list }
          }
          // Update the stable UI list
          roleTemplatesView.value = list
          
          // Also update global roleTemplates array for consistency
          const globalList = Array.isArray(roleTemplates.value) ? [...roleTemplates.value] : []
          const existingIdx = globalList.findIndex(r => (r && ((r._id || r.id) === (created._id || created.id))))
          if (existingIdx >= 0) {
            globalList.splice(existingIdx, 1, created)
          } else {
            globalList.unshift(created)
          }
          roleTemplates.value = globalList
        }
      } catch (e) { 
        console.warn('Local role template creation failed:', e)
      }
    }
    // Close modal immediately after successful local update
    // Note: Removed refreshProject() call to prevent clearing roles due to timing/permission issues
    closeRoleModal()
  } catch (err: any) {
    console.error('saveRoleTemplate error', err)
    ui.showError(err?.response?.data?.error || 'Failed to save role template')
  }
}

async function deleteRoleTemplate(tpl: any) {
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id))
    if (!pid) return ui.showError('No project selected')
    const id = tpl._id || tpl.id || editingRoleTemplate.value._id
    if (!id) return ui.showError('No template selected')
    if (!confirm('Delete this role template?')) return
      await http.delete(`/api/projects/${pid}/roles/${id}`, { headers: getAuthHeaders() })
      ui.showSuccess('Role template deleted')
      // remove locally so UI updates immediately
      try {
        // Get the source of currently displayed roles directly (avoid computed property circular dependency)
        let currentlyDisplayed: any[] = []
        if (project.value && Array.isArray(project.value.roleTemplates) && project.value.roleTemplates.length > 0) {
          currentlyDisplayed = [...project.value.roleTemplates]
        } else if (Array.isArray(roleTemplates.value)) {
          currentlyDisplayed = [...roleTemplates.value]
        }
        
        // Remove the deleted role from the currently displayed roles
        const filteredTemplates = currentlyDisplayed.filter((r: any) => ((r._id || r.id) !== id))
        
        // Update project roleTemplates
        if (project.value) {
          project.value = { ...project.value, roleTemplates: filteredTemplates }
        }
        
        // Also update global roleTemplates cache if present
        if (Array.isArray(roleTemplates.value)) {
          roleTemplates.value = [...roleTemplates.value.filter((r: any) => ((r._id || r.id) !== id))]
        }
      } catch (e) { 
        console.warn('Local role template deletion failed:', e)
      }
      // Note: Removed refreshProject() call to prevent clearing roles due to timing/permission issues
      closeRoleModal()
  } catch (err: any) {
    console.error('deleteRoleTemplate error', err)
    ui.showError(err?.response?.data?.error || 'Failed to delete role template')
  }
}

async function fetchRoleTemplates() {
  try {
    // Only global admins should call admin endpoints to avoid 403 noise in console
    const userRole = String((authStore.user && authStore.user.role) || '').toLowerCase()
    const isGlobalAdmin = userRole === 'globaladmin' || userRole === 'superadmin'
    if (!isGlobalAdmin) {
      roleTemplates.value = []
      return
    }

    const pid = projectId || (project.value && (project.value._id || project.value.id))
    const globalResp = await http.get('/api/admin/roles?scope=global', { headers: getAuthHeaders(), validateStatus: (s) => s >= 200 && s < 300 })
    let list = Array.isArray(globalResp.data) ? globalResp.data : []
    if (pid) {
      try {
        const resp = await http.get(`/api/admin/roles?scope=project&projectId=${pid}`, { headers: getAuthHeaders(), validateStatus: (s) => s >= 200 && s < 300 })
        if (Array.isArray(resp.data)) list = list.concat(resp.data)
      } catch (e) {
        // ignore project-scoped fetch failures (likely permission)
      }
    }
    roleTemplates.value = Array.isArray(list) ? list : []
  } catch (e) {
    // leave roleTemplates empty on any failure
    roleTemplates.value = []
  }
}

const selectedRoleTemplate = computed(() => {
  try {
    const rv = displayedRoleTemplates.value || []
    return rv.find((r: any) => r && (r.name === (newMember.value.role || '')) ) || null
  } catch (e) { return null }
})

// Computed property for roles to display - prefer the stable UI list first
const displayedRoleTemplates = computed(() => {
  try {
    if (Array.isArray(roleTemplatesView.value) && roleTemplatesView.value.length > 0) {
      return roleTemplatesView.value
    }
    if (project.value && Array.isArray(project.value.roleTemplates) && project.value.roleTemplates.length > 0) {
      return project.value.roleTemplates
    }
    return Array.isArray(roleTemplates.value) ? roleTemplates.value : []
  } catch (e) {
    return []
  }
})
// Determine whether current auth user is a project admin (team role 'admin' or 'CxA')
const currentProjectMember = computed(() => {
  try {
    const me = authStore.user
    if (!me || !project.value || !Array.isArray(project.value.team)) return null
    return project.value.team.find((t: any) => (String(t._id) === String(me._id) || String((t.email || '')).toLowerCase() === String((me.email || '')).toLowerCase())) || null
  } catch (e) { return null }
})

const isProjectAdmin = computed(() => {
  const m = currentProjectMember.value
  if (!m) return false
  const r = String(m.role || '').toLowerCase()
  return r === 'admin' || r === 'cxa' || r === 'cxa' || r === 'cxa'
})

const isGlobalAdmin = computed(() => {
  const role = String(authStore.user?.role || '').toLowerCase()
  return role === 'globaladmin' || role === 'superadmin'
})

const canManageTeamRoles = computed(() => isProjectAdmin.value || isGlobalAdmin.value)

const defaultTeamRoleNames = computed(() => {
  const opts: any[] = (lists as any)?.roleOptions || []
  return opts
    .map(o => (o && o.value != null ? String(o.value).trim() : ''))
    .filter(Boolean)
})

const assignableRoleOptions = computed(() => {
  const templates = (displayedRoleTemplates.value || []) as any[]

  // Collect unique (case-insensitive) template names.
  const seen = new Set<string>()
  const templateNames: string[] = []
  for (const t of templates) {
    const name = String((t && t.name) || '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (key === 'admin') continue
    if (seen.has(key)) continue
    seen.add(key)
    templateNames.push(name)
  }

  // Preserve ordering from lists.js for standard roles, then append any custom templates.
  const defaults = defaultTeamRoleNames.value
  const orderedDefaults = defaults.slice()
  const custom = templateNames.filter(n => !defaults.some(d => d.toLowerCase() === n.toLowerCase()))
  custom.sort((a, b) => a.localeCompare(b))

  const opts = [...orderedDefaults, ...custom].map(r => ({ value: r, text: r }))
  if (canManageTeamRoles.value) return [{ value: 'admin', text: 'admin' }, ...opts]
  return opts
})

watch(
  () => assignableRoleOptions.value,
  (opts) => {
    if (!opts || !opts.length) return
    const current = String(newMember.value.role || '').trim().toLowerCase()
    const values = opts.map(o => String(o.value || '').trim().toLowerCase())
    if (current && values.includes(current)) return
    const userOpt = opts.find(o => String(o.value) === 'User')
    newMember.value.role = userOpt ? String(userOpt.value) : String(opts[0].value)
  },
  { immediate: true, deep: true }
)

const missingStandardRoleTemplates = computed(() => {
  const desired = ['admin', ...defaultTeamRoleNames.value]
  const existing = (displayedRoleTemplates.value || []).map((t: any) => String(t && t.name || '').trim().toLowerCase()).filter(Boolean)
  const set = new Set(existing)
  return desired.filter(n => !set.has(String(n).trim().toLowerCase()))
})

async function seedMissingStandardRoleTemplates() {
  if (!canManageTeamRoles.value) return
  if (!project.value) return
  const pid = projectId || (project.value && (project.value._id || project.value.id))
  if (!pid) return
  seedRoleTemplatesBusy.value = true
  try {
    const { data } = await http.post(`/api/projects/${pid}/roles/seed-defaults`, {}, { headers: getAuthHeaders() })
    const list = data && data.roleTemplates ? data.roleTemplates : null
    if (list && project.value) project.value = { ...project.value, roleTemplates: list }
    ui.showSuccess(`Added ${data && typeof data.added === 'number' ? data.added : 0} role templates`)
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || 'Failed to seed role templates')
  } finally {
    seedRoleTemplatesBusy.value = false
  }
}

const projectTagInput = ref('')
function normalizeProjectTags(tags: any) {
  const arr = Array.isArray(tags) ? tags : []
  const out: string[] = []
  const seen = new Set<string>()
  for (const t of arr) {
    const s = String(t || '').trim()
    if (!s) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}
function addProjectTag(tag: string) {
  if (!project.value) return
  const t = String(tag || '').trim()
  if (!t) return
  project.value.tags = normalizeProjectTags([...(project.value.tags || []), t])
}
function addProjectTagFromInput() {
  if (!project.value) return
  const raw = String(projectTagInput.value || '').trim()
  if (!raw) return
  const parts = raw.split(/[,;]+/).map(s => s.trim()).filter(Boolean)
  for (const p of parts) addProjectTag(p)
  projectTagInput.value = ''
}
function removeProjectTag(tag: string) {
  if (!project.value) return
  const key = String(tag || '').trim().toLowerCase()
  project.value.tags = (project.value.tags || []).filter((t: any) => String(t || '').trim().toLowerCase() !== key)
}

// Issues per-page (local, per-project) preference UI
const issuesPageSizeLocal = ref(10)
const issuesPageSizeStorageKey = computed(() => {
  const id = (project.value && (project.value._id || project.value.id)) || projectId || 'global'
  return `issuesPageSize:${id}`
})
function loadIssuesPageSizeLocal() {
  try {
    const raw = localStorage.getItem(issuesPageSizeStorageKey.value)
    if (!raw) return
    const n = parseInt(raw, 10)
    if ([5, 10, 25, 50, 100].includes(n)) issuesPageSizeLocal.value = n
  } catch (e) { /* ignore localStorage read errors */ }
}
function persistIssuesPageSize() {
  try { localStorage.setItem(issuesPageSizeStorageKey.value, String(issuesPageSizeLocal.value)) } catch (e) { /* ignore localStorage write errors */ }
}
watch(issuesPageSizeStorageKey, () => loadIssuesPageSizeLocal(), { immediate: true })

// AI settings (Premium only; bring-your-own OpenAI key stored encrypted server-side)
const aiEnabled = ref(false)
const aiProvider = ref<'openai' | 'gemini' | 'claude'>('openai')
const aiModel = ref('gpt-4o-mini')
const aiHasKey = ref(false)
const aiLastVerifiedAt = ref<string | null>(null)
const aiNotInPlan = ref(false)
const aiError = ref('')
const aiKeyDraft = ref('')
const aiSaving = ref(false)
const aiTesting = ref(false)
const aiLoaded = ref(false)

function aiProjectId() {
  return String(projectId || (project.value && ((project.value as any)._id || (project.value as any).id)) || '')
}

function goToSubscriptionForUpgrade(featureKey: string) {
  activeTab.value = 'subscription'
  router.replace({ query: { ...route.query, tab: 'subscription', upgrade: featureKey } })
}

async function loadAiSettings() {
  const pid = aiProjectId()
  if (!pid || !isProjectAdmin.value) return
  if (aiLoaded.value) return
  aiError.value = ''
  aiNotInPlan.value = false
  try {
    const res = await http.get(`/api/projects/${pid}/ai`, { headers: getAuthHeaders() })
    const data = res.data || {}
    aiEnabled.value = !!data.enabled
    const p = String(data.provider || 'openai').toLowerCase()
    aiProvider.value = (p === 'gemini' ? 'gemini' : (p === 'claude' ? 'claude' : 'openai'))
    aiModel.value = String(data.model || (aiProvider.value === 'gemini' ? 'gemini-1.5-flash' : (aiProvider.value === 'claude' ? 'claude-3-5-sonnet-latest' : 'gpt-4o-mini')))
    aiHasKey.value = !!data.hasKey
    aiLastVerifiedAt.value = data.lastVerifiedAt ? String(data.lastVerifiedAt) : null
    aiLoaded.value = true
  } catch (e: any) {
    const code = e?.response?.data?.code
    if (e?.response?.status === 403 && code === 'FEATURE_NOT_IN_PLAN') {
      aiNotInPlan.value = true
      aiLoaded.value = true
      return
    }
    aiError.value = e?.response?.data?.error || e?.message || 'Failed to load AI settings'
  }
}

async function saveAiSettings() {
  const pid = aiProjectId()
  if (!pid) return
  aiSaving.value = true
  aiError.value = ''
  try {
    const payload: any = {
      enabled: !!aiEnabled.value,
      provider: aiProvider.value,
      model: String(aiModel.value || '').trim() || (aiProvider.value === 'gemini' ? 'gemini-1.5-flash' : (aiProvider.value === 'claude' ? 'claude-3-5-sonnet-latest' : 'gpt-4o-mini')),
    }
    if (String(aiKeyDraft.value || '').trim()) payload.apiKey = String(aiKeyDraft.value).trim()
    const res = await http.put(`/api/projects/${pid}/ai`, payload, { headers: getAuthHeaders() })
    const data = res.data || {}
    aiEnabled.value = !!data.enabled
    {
      const p = String(data.provider || aiProvider.value || 'openai').toLowerCase()
      aiProvider.value = (p === 'gemini' ? 'gemini' : (p === 'claude' ? 'claude' : 'openai'))
    }
    aiModel.value = String(data.model || aiModel.value || (aiProvider.value === 'gemini' ? 'gemini-1.5-flash' : (aiProvider.value === 'claude' ? 'claude-3-5-sonnet-latest' : 'gpt-4o-mini')))
    aiHasKey.value = !!data.hasKey
    aiLastVerifiedAt.value = data.lastVerifiedAt ? String(data.lastVerifiedAt) : null
    aiKeyDraft.value = ''
    aiLoaded.value = true
    ui.showSuccess('AI settings saved')
  } catch (e: any) {
    const code = e?.response?.data?.code
    if (code === 'AI_ENCRYPTION_KEY_MISSING') {
      aiError.value = 'Server is missing AI_ENCRYPTION_KEY, so project keys cannot be securely stored. Ask an admin to configure it on the backend, then try again.'
    } else {
      aiError.value = e?.response?.data?.error || e?.message || 'Failed to save AI settings'
    }
    ui.showError(aiError.value)
  } finally {
    aiSaving.value = false
  }
}

async function clearAiKey() {
  const pid = aiProjectId()
  if (!pid) return
  aiSaving.value = true
  aiError.value = ''
  try {
    const payload: any = { enabled: !!aiEnabled.value, provider: aiProvider.value, model: String(aiModel.value || '').trim() || (aiProvider.value === 'gemini' ? 'gemini-1.5-flash' : (aiProvider.value === 'claude' ? 'claude-3-5-sonnet-latest' : 'gpt-4o-mini')), apiKey: '' }
    const res = await http.put(`/api/projects/${pid}/ai`, payload, { headers: getAuthHeaders() })
    const data = res.data || {}
    aiHasKey.value = !!data.hasKey
    aiLastVerifiedAt.value = null
    aiKeyDraft.value = ''
    ui.showSuccess('AI key cleared')
  } catch (e: any) {
    aiError.value = e?.response?.data?.error || e?.message || 'Failed to clear AI key'
    ui.showError(aiError.value)
  } finally {
    aiSaving.value = false
  }
}

async function testAiSettings() {
  const pid = aiProjectId()
  if (!pid) return
  aiTesting.value = true
  aiError.value = ''
  try {
    const res = await http.post(`/api/projects/${pid}/ai/test`, {}, { headers: getAuthHeaders() })
    const data = res.data || {}
    aiLastVerifiedAt.value = data.lastVerifiedAt ? String(data.lastVerifiedAt) : (aiLastVerifiedAt.value || null)
    ui.showSuccess('AI key verified')
  } catch (e: any) {
    const code = e?.response?.data?.code
    if (code === 'AI_ENCRYPTION_KEY_MISSING') {
      aiError.value = 'Server is missing AI_ENCRYPTION_KEY, so the saved project key cannot be decrypted. Ask an admin to configure it on the backend, then try again.'
    } else {
      aiError.value = e?.response?.data?.error || e?.message || 'AI test failed'
    }
    ui.showError(aiError.value)
  } finally {
    aiTesting.value = false
  }
}

watch(activeTab, (v) => {
  if (v === 'settings') loadAiSettings()
}, { immediate: true })

// If the project changes (route switch), re-load AI settings for the new project.
watch(project, () => {
  aiLoaded.value = false
  aiNotInPlan.value = false
  aiError.value = ''
  aiKeyDraft.value = ''
  aiLastVerifiedAt.value = null
}, { deep: false })

watch(aiProvider, (p) => {
  const next = String(p || '').toLowerCase()
  if (next === 'gemini' && (!aiModel.value || aiModel.value === 'gpt-4o-mini' || aiModel.value.startsWith('claude'))) aiModel.value = 'gemini-1.5-flash'
  if (next === 'claude' && (!aiModel.value || aiModel.value === 'gpt-4o-mini' || aiModel.value.startsWith('gemini'))) aiModel.value = 'claude-3-5-sonnet-latest'
  if (next === 'openai' && (!aiModel.value || aiModel.value.startsWith('gemini') || aiModel.value.startsWith('claude'))) aiModel.value = 'gpt-4o-mini'
})

function tabClass(t: string) {
  return activeTab.value === t ? 'bg-white/10 text-white font-medium' : 'bg-white/5 text-white/80'
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function refreshBillingStateAfterCheckout() {
  for (let attempt = 0; attempt < 3; attempt++) {
    await refreshProject()
    await loadBillingSummary()
    await loadTransactions()
    if (project.value?.stripeSubscriptionId) return true
    await sleep(1500 + attempt * 1500)
  }
  return false
}

// local showToast removed; use `ui.showSuccess` / `ui.showError` instead

onMounted(async () => {
  setActiveTabFromQuery()
  if (projectIdString.value) {
    try {
      const p = await projectStore.fetchProject(projectIdString.value)
      project.value = { ...p }
      if (!project.value.searchMode) project.value.searchMode = 'substring'
      // attempt to load role templates for richer role selection (global admins only)
      try {
        const role = String((authStore.user && authStore.user.role) || '').toLowerCase()
        if (role === 'globaladmin' || role === 'superadmin') {
          await fetchRoleTemplates()
        }
      } catch (e) { /* ignore */ }
      // Seed UI list from project on first load
      if (Array.isArray(project.value.roleTemplates) && project.value.roleTemplates.length > 0) {
        roleTemplatesView.value = project.value.roleTemplates.slice()
      } else if (Array.isArray(roleTemplates.value) && roleTemplates.value.length > 0) {
        roleTemplatesView.value = roleTemplates.value.slice()
      }
    } catch (e) {
      ui.showError('Failed to load project')
      router.push('/projects')
    }
  } else {
    // If no projectId provided, prefer the currentProject from the store (user default)
    if (projectStore.currentProject) {
      // Pinia unwraps refs on the store; access directly
      project.value = { ...projectStore.currentProject }
      if (!project.value.searchMode) project.value.searchMode = 'substring'
    }
    // Watch for the store to populate (async fetch) and set project when ready
    watch(() => projectStore.currentProject, (nv) => {
      if (!projectId && nv) { project.value = { ...nv }; if (!project.value.searchMode) project.value.searchMode = 'substring' }
    }, { immediate: true })
    // fallback: if after a short tick we still don't have a project, try reading selectedProjectId from localStorage and fetch directly
    await nextTick()
    if (!project.value && typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedProjectId')
      if (stored) {
        try {
          const p2 = await projectStore.fetchProject(stored)
          project.value = { ...p2 }
          if (!project.value.searchMode) project.value.searchMode = 'substring'
        } catch (e) {
          // silent
        }
      }
    }
  }
  // If returning from Stripe checkout, refresh project to pick up webhook updates
  if (route.query && route.query.checkout === 'success') {
    await refreshBillingStateAfterCheckout()
    if (!project.value?.stripeSubscriptionId) {
      try {
        await handleReconcileSubscription()
        await refreshBillingStateAfterCheckout()
      } catch (e) {
        // ignore: user can reconcile manually if needed
      }
    }
    ui.showSuccess('Subscription updated')
  } else if (route.query && route.query.checkout === 'cancel') {
    ui.showError('Checkout cancelled')
  }
  // load invites for the project
  await loadInvites()
})

async function loadInvites() {
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id));
    if (!pid) return;
    const { data } = await http.get(`/api/projects/${pid}/invites`, { headers: getAuthHeaders() })
    invites.value = data || []
  } catch (err: any) {
    const status = err?.response?.status
    if (status !== 404) {
      console.error('loadInvites error', err)
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function resendInvite(inviteId: string) {
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id));
    if (!pid) return ui.showError('No project selected')
  await http.post(`/api/projects/${pid}/resend-invite`, { inviteId }, { headers: getAuthHeaders() })
    ui.showSuccess('Invitation resent')
    // reload invites to update timestamps
    await loadInvites()
  } catch (err: any) {
    console.error('resendInvite error', err)
    ui.showError(err?.response?.data?.error || 'Failed to resend invite')
  }
}

function findInviteIdForMember(member: any) {
  try {
    if (!member || !member.email) return null
    const e = String(member.email).toLowerCase()
    const inv = (invites.value || []).find(i => i && i.email && String(i.email).toLowerCase() === e)
    if (!inv) return null
    return inv._id || inv.id || null
  } catch (e) {
    return null
  }
}

function isResending(inviteId: string | null) {
  return !!inviteId && loadingInviteIds.value.includes(inviteId)
}

async function resendInviteForMember(member: any) {
  try {
    const id = findInviteIdForMember(member)
    if (!id) return ui.showError('No matching invite found for that member')
    if (isResending(id)) return
    loadingInviteIds.value.push(id)
    await resendInvite(id)
  } catch (err: any) {
    console.error('resendInviteForMember error', err)
    ui.showError('Failed to resend invite')
  } finally {
    const id = findInviteIdForMember(member)
    const idx = id ? loadingInviteIds.value.indexOf(id) : -1
    if (idx !== -1) loadingInviteIds.value.splice(idx, 1)
  }
}

function fmt(d: any) { try { return d ? new Date(d).toLocaleString() : '' } catch (e) { return String(d || '') } }
const allTypes = computed<string[]>(() => {
  const set = new Set<string>()
  for (const e of (logs.value || [])) { if (e && e.type) set.add(String(e.type)) }
  return Array.from(set).sort()
})
const startDate = computed(() => {
  if (!startDateText.value) return null
  try { return new Date(startDateText.value) } catch (e) { return null }
})
const endDate = computed(() => {
  if (!endDateText.value) return null
  try { return new Date(endDateText.value) } catch (e) { return null }
})
const filteredLogs = computed(() => {
  const q = (logsSearch.value || '').toLowerCase()
  const type = (selectedType.value || '').toLowerCase()
  const sdt = startDate.value ? startDate.value.getTime() : null
  const edt = endDate.value ? endDate.value.getTime() : null
  return (logs.value || []).filter((e) => {
    // type filter
    if (type && String(e.type || '').toLowerCase() !== type) return false
    // date range filter (inclusive)
    if (sdt) { const et = e && e.ts ? new Date(e.ts).getTime() : 0; if (et && et < sdt) return false }
    if (edt) { const et = e && e.ts ? new Date(e.ts).getTime() : 0; if (et && et > edt) return false }
    // search filter
    if (!q) return true
    return JSON.stringify(e).toLowerCase().includes(q)
  })
})
async function loadLogs() {
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id))
    if (!pid) return
    const opts: any = { limit: logsPerPage.value, page: logsPage.value }
    if (selectedType.value) opts.type = selectedType.value
    const res = await projectStore.fetchProjectLogs(String(pid), opts)
    logs.value = Array.isArray(res.items) ? res.items : []
    logsTotal.value = Number(res.total || 0)
  } catch (err) {
    // noop
  }
}

function loadPrevPage() {
  if (logsPage.value <= 1) return
  logsPage.value -= 1
  loadLogs()
}

function loadNextPage() {
  const totalPages = Math.max(1, Math.ceil((logsTotal.value || 0) / logsPerPage.value))
  if (logsPage.value >= totalPages) return
  logsPage.value += 1
  loadLogs()
}

function exportCsv() {
  const headers = ['ts','by','type','equipmentTag','equipmentId','sectionNumber','sectionTitle','questionNumber','questionText']
  const rows = filteredLogs.value.map((e) => [
    e.ts || '',
    e.by || '',
    e.type || '',
    (e.scope && e.scope.equipmentTag) || '',
    (e.scope && e.scope.equipmentId) || '',
    (e.section && (e.section.number ?? '')) || '',
    (e.section && (e.section.title || '')) || '',
    (e.question && (e.question.number ?? '')) || '',
    (e.question && (e.question.text || '')) || '',
  ])
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => {
      const s = String(v ?? '')
      if (s.includes('"') || s.includes(',') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"'
      return s
    }).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `project-logs-${new Date().toISOString().slice(0,19)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Lazy-load logs when tab is opened (initialize page)
watch(activeTab, (t) => {
  if (t === 'logs' && (!logs.value.length || logsTotal.value === 0)) { logsPage.value = 1; loadLogs() }
  if (t === 'subscription') { transactionsPage.value = 1; loadTransactions(); loadBillingSummary() }
})
// Reload logs when type filter changes (server-side filter), reset to first page
watch(selectedType, () => { logsPage.value = 1; loadLogs() })

function removeMember(m: any) {
  project.value.team = (project.value.team || []).filter((tm: any) => (tm._id || tm.email) !== (m._id || m.email))
}

function statusBadgeClass(status: any) {
  const s = String(status || '').toLowerCase()
  if (s === 'invited' || s === 'pending') return 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
  if (s === 'rejected' || s === 'declined') return 'bg-gray-600/20 text-gray-200 border border-gray-600/30'
  if (s === 'active' || s === 'accepted' || s === 'member') return 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
  return 'bg-white/6 text-white/80 border border-white/10'
}

function statusLabel(member: any) {
  const raw = member && (member.status || member.inviteStatus) ? String(member.status || member.inviteStatus) : (member && member._id ? 'active' : 'invited')
  const s = String(raw || '').toLowerCase()
  if (s === 'invited' || s === 'pending') return 'Invited'
  if (s === 'rejected' || s === 'declined') return 'Rejected'
  if (s === 'active' || s === 'accepted' || s === 'member') return 'Active'
  // fallback: humanize
  return String(raw).toString()
}

async function addMember() {
  if (!newMember.value.email) return ui.showError('Email required')
  // do not provide _id here; let the backend/mongoose generate a proper ObjectId for subdocs
  // member variable not used directly; payload built from newMember.value below
  // Prefer calling the dedicated addUser API so the server can create an Invitation
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id))
    if (!pid) return ui.showError('No project selected')
    const payload = {
      projectId: pid,
      email: (newMember.value.email || '').trim(),
      firstName: newMember.value.firstName || '',
      lastName: newMember.value.lastName || '',
      company: newMember.value.company || '',
      role: newMember.value.role || 'User'
    }
    const { data } = await http.post('/api/projects/addUser', payload, { headers: getAuthHeaders() })
    // If backend added user directly or created an invite, refresh project and invites
    await refreshProject()
    await loadInvites()
    ui.showSuccess(data && data.message ? data.message : 'Member added')
  } catch (err: any) {
    console.error('addMember error', err)
    const serverData = err?.response?.data
    const msg = serverData ? (typeof serverData === 'string' ? serverData : (serverData.error || JSON.stringify(serverData))) : (err?.message || 'Failed to add member')
    ui.showError(msg)
  } finally {
    newMember.value = { email: '', firstName: '', lastName: '', company: '', role: 'User' }
  }
}

function ensureCommissioningAgent() {
  if (!project.value) return
  if (!project.value.commissioning_agent) project.value.commissioning_agent = {}
}

async function fileToResizedDataUrl(
  file: File,
  opts?: { maxDim?: number; mime?: string; quality?: number; maxBytes?: number }
): Promise<string> {
  const maxDim = opts?.maxDim ?? 512
  const mime = opts?.mime ?? 'image/jpeg'
  const maxBytes = opts?.maxBytes ?? 350 * 1024
  let quality = opts?.quality ?? 0.9

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Failed to load image'))
    i.src = dataUrl
  })

  const srcW = img.naturalWidth || img.width || 1
  const srcH = img.naturalHeight || img.height || 1
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH))
  const w = Math.max(1, Math.round(srcW * scale))
  const h = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(img, 0, 0, w, h)

  const sizeOf = (s: string) => {
    try {
      const idx = s.indexOf(',')
      const b64 = idx >= 0 ? s.slice(idx + 1) : s
      // base64 length -> bytes
      return Math.floor((b64.length * 3) / 4)
    } catch (e) {
      return Number.MAX_SAFE_INTEGER
    }
  }

  // Iteratively reduce quality until under maxBytes (JPEG/WEBP only)
  let out = canvas.toDataURL(mime, quality)
  let bytes = sizeOf(out)
  while (bytes > maxBytes && quality > 0.55) {
    quality = Math.max(0.55, quality - 0.08)
    out = canvas.toDataURL(mime, quality)
    bytes = sizeOf(out)
  }
  return out
}

function approxDataUrlBytes(s: string): number {
  try {
    if (!s) return 0
    const idx = s.indexOf(',')
    const b64 = idx >= 0 ? s.slice(idx + 1) : s
    return Math.floor((b64.length * 3) / 4)
  } catch (e) {
    return Number.MAX_SAFE_INTEGER
  }
}

async function dataUrlToResizedDataUrl(
  dataUrl: string,
  opts?: { maxDim?: number; mime?: string; quality?: number; maxBytes?: number }
): Promise<string> {
  const maxDim = opts?.maxDim ?? 512
  const mime = opts?.mime ?? 'image/jpeg'
  const maxBytes = opts?.maxBytes ?? 350 * 1024
  let quality = opts?.quality ?? 0.9

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Failed to load image'))
    i.src = dataUrl
  })

  const srcW = img.naturalWidth || img.width || 1
  const srcH = img.naturalHeight || img.height || 1
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH))
  const w = Math.max(1, Math.round(srcW * scale))
  const h = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(img, 0, 0, w, h)

  let out = canvas.toDataURL(mime, quality)
  let bytes = approxDataUrlBytes(out)
  while (bytes > maxBytes && quality > 0.55) {
    quality = Math.max(0.55, quality - 0.08)
    out = canvas.toDataURL(mime, quality)
    bytes = approxDataUrlBytes(out)
  }
  return out
}

async function ensureProjectLogosWithinLimit() {
  if (!project.value) return
  const MAX_BYTES = 350 * 1024
  const OPTS = { maxDim: 512, mime: 'image/jpeg', quality: 0.9, maxBytes: MAX_BYTES }

  try {
    const logo = String(project.value.logo || '')
    if (logo.startsWith('data:') && approxDataUrlBytes(logo) > MAX_BYTES) {
      project.value.logo = await dataUrlToResizedDataUrl(logo, OPTS)
    }
  } catch (e) {
    // ignore; let backend return 413 if still too large
  }

  try {
    const cxaLogo = String(project.value?.commissioning_agent?.logo || '')
    if (cxaLogo.startsWith('data:') && approxDataUrlBytes(cxaLogo) > MAX_BYTES) {
      ensureCommissioningAgent()
      project.value.commissioning_agent.logo = await dataUrlToResizedDataUrl(cxaLogo, OPTS)
    }
  } catch (e) {
    // ignore; let backend return 413 if still too large
  }
}

async function onClientLogoSelected(e: Event) {
  const input = e.target as HTMLInputElement | null
  const f = input && input.files && input.files[0]
  if (!f) return
  try {
    project.value.logo = await fileToResizedDataUrl(f, { maxDim: 512, mime: 'image/jpeg', quality: 0.9, maxBytes: 350 * 1024 })
    await projectStore.updateProject({ ...project.value })
    ui.showSuccess('Client logo saved')
  } catch (err: any) {
    ui.showError(err?.response?.data?.error || err?.message || 'Failed to save client logo')
  }
}

async function onCxaLogoSelected(e: Event) {
  const input = e.target as HTMLInputElement | null
  const f = input && input.files && input.files[0]
  if (!f) return
  ensureCommissioningAgent()
  try {
    project.value.commissioning_agent.logo = await fileToResizedDataUrl(f, { maxDim: 512, mime: 'image/jpeg', quality: 0.9, maxBytes: 350 * 1024 })
    await projectStore.updateProject({ ...project.value })
    ui.showSuccess('Commissioning Agent logo saved')
  } catch (err: any) {
    ui.showError(err?.response?.data?.error || err?.message || 'Failed to save CxA logo')
  }
}

async function removeClientLogo() {
  project.value.logo = ''
  try {
    await projectStore.updateProject({ ...project.value })
    ui.showSuccess('Client logo removed')
  } catch (err) {
    ui.showError('Failed to remove client logo')
  }
}

async function removeCxaLogo() {
  ensureCommissioningAgent()
  project.value.commissioning_agent.logo = ''
  try {
    await projectStore.updateProject({ ...project.value })
    ui.showSuccess('CxA logo removed')
  } catch (err) {
    ui.showError('Failed to remove CxA logo')
  }
}

const saving = ref(false)
async function save() {
  if (saving.value) return
  try {
    saving.value = true
    await ensureProjectLogosWithinLimit()
    await projectStore.updateProject(project.value)
    ui.showSuccess('Saved')
  } catch (e: any) {
    console.error('ProjectEdit.save error:', e)
    let msg = 'Failed to save'
    try {
      if (e && e.response && e.response.data) {
        msg = e.response.data.error || e.response.data.message || JSON.stringify(e.response.data)
      } else if (e && e.message) {
        msg = e.message
      } else {
        msg = String(e)
      }
    } catch (ex) {
      msg = 'Failed to save'
    }
    if (msg === 'Network Error') {
      msg = `Network Error: cannot reach API at ${getApiBase()}. Verify the backend is running and VITE_API_BASE is correct.`
    }
    ui.showError(msg)
  } finally {
    saving.value = false
  }
}

// Your three monthly plan price IDs:
const prices = ref<StripePrice[]>([])
const selectedPrice = ref<string | null>(null)
const loading = ref(false)
const stripeKeyPresent = computed(() => {
  try {
    const v = import.meta && import.meta.env && import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    return !!(v && String(v).length > 0)
  } catch (e) {
    return false
  }
})
const isSamePlanSelected = computed(() => {
  const currentId = String(billingSummary.value?.priceId || project.value?.stripePriceId || '')
  const sel = selectedPrice.value ? resolvePriceId(String(selectedPrice.value)) : ''
  return Boolean(currentId && sel && currentId === sel)
})

const status = computed(() => billingSummary.value?.status || project.value?.stripeSubscriptionStatus || project.value?.status || 'trialing');
const planLabel = computed(() => {
  const summaryPlan = billingSummary.value?.plan
  if (summaryPlan && (summaryPlan.label || summaryPlan.name)) return summaryPlan.label || summaryPlan.name
  const id = billingSummary.value?.priceId || project.value?.stripePriceId || selectedPrice.value || project.value?.subscriptionTier
  const details = id ? (planDetailsById.value && planDetailsById.value[id]) : null
  if (details && (details.name || details.label)) return details.name || details.label
  const p = (prices.value || []).find(x => x.id === id || x.priceId === id || x.key === id)
  if (p) return p.label || p.name || (p.key ? p.key.charAt(0).toUpperCase() + p.key.slice(1) : 'Plan')
  if (project.value?.subscriptionTier) {
    const tier = String(project.value.subscriptionTier)
    const match = (prices.value || []).find(x => x.key === tier)
    if (match) return match.label || match.name || tier
    return tier.charAt(0).toUpperCase() + tier.slice(1)
  }
  return id || 'No plan'
});
const hasSubscription = computed(() => Boolean(billingSummary.value?.subscriptionId || project.value?.stripeSubscriptionId))
const checkoutPending = computed(() => Boolean(project.value?.stripePriceId) && !project.value?.stripeSubscriptionId)
// Frontend permission guard mirroring backend canManageBilling: allow global admins, project billing admin, or team admins
const canManageBilling = computed(() => {
  try {
    const authUser: any = (authStore && (authStore as any).user) ? (authStore as any).user : null
    const role = authUser?.role || 'user'
    if (role === 'globaladmin' || role === 'superadmin') return true
    const p: any = project.value || null
    if (!p) return false
    const uid = String(authUser?._id || authUser?.id || '')
    const email = authUser?.email ? String(authUser.email).toLowerCase() : null
    if (p.billingAdminUserId && String(p.billingAdminUserId) === uid) return true
    const team = Array.isArray(p.team) ? p.team : []
    const member = team.find((t: any) => {
      if (!t) return false
      if (t._id && String(t._id) === uid) return true
      if (t.email && email && String(t.email).toLowerCase() === email) return true
      return false
    })
    if (member && (member.role === 'admin' || member.role === 'globaladmin')) return true
    return false
  } catch (e) { return false }
})
const billingAdminOptions = computed(() => {
  const team = project.value && Array.isArray(project.value.team) ? project.value.team : []
  return team.filter((m: any) => m && (m._id || m.email))
})

// Plan details shown in the UI when a selection is made
const planDetailsById = ref<Record<string, any>>({})

const selectedPlanDetails = computed(() => {
  const id = selectedPrice.value;
  if (!id) return null;
  const info = (planDetailsById.value && planDetailsById.value[id]) || null;
  if (info) return info;
  const p = (prices.value || []).find(x => x.id === id);
  if (!p) return null;
  // Fallback: derive name/price from label if not found in map
  const parts = String(p.label).split('–');
  return {
    name: parts[0]?.trim() || 'Selected Plan',
    price: parts[1]?.trim() || '',
    summary: '',
    features: []
  };
});

// Ensure any selection resolves to a proper Stripe Price ID
function resolvePriceId(sel: unknown) {
  const s = String(sel || '').trim();
  if (!s) return s;
  if (s.startsWith('price_')) return s;
  const byId = (prices.value || []).find(x => String(x.id) === s);
  if (byId && String(byId.priceId || '').startsWith('price_')) return String(byId.priceId);
  const byKey = (prices.value || []).find(x => String(x.key || '') === s);
  if (byKey && String(byKey.priceId || '').startsWith('price_')) return String(byKey.priceId);
  const byMap = planDetailsById.value && planDetailsById.value[s] ? s : null;
  if (byMap && s.startsWith('price_')) return s;
  // Fallback: prefer current billingSummary priceId when available
  if (billingSummary.value && billingSummary.value.priceId) return String(billingSummary.value.priceId);
  // Otherwise return the original; backend will validate
  return s;
}

function resolveCurrentPlanId() {
  if (billingSummary.value?.priceId) return String(billingSummary.value.priceId)
  if (project.value?.stripePriceId) return String(project.value.stripePriceId)
  if (project.value?.subscriptionTier) return String(project.value.subscriptionTier)
  return prices.value.length ? String(prices.value[0].id) : null
}

async function loadPlansAndSelect() {
  try {
    const { data } = await http.get('/api/plans');
    const rawList = Array.isArray(data) ? data : [];
    const list = rawList.length ? rawList : [
      { key: 'basic', name: 'Basic', label: 'Basic — $29/mo', priceId: 'price_basic' },
      { key: 'standard', name: 'Standard', label: 'Standard — $49/mo', priceId: 'price_standard' },
      { key: 'premium', name: 'Premium', label: 'Premium — $99/mo', priceId: 'price_premium' },
    ];
    prices.value = list.map(p => {
      const id = String(p.priceId || p.key || '').trim() || String(p.key || 'basic');
      return { id, priceId: id, label: p.label || p.name || p.key || id, key: p.key, name: p.name || p.label || id };
    });
    const details: Record<string, any> = {};
    for (const p of list) {
      const id = String(p.priceId || p.key || '');
      const parts = String(p.label || p.name || '').split('–');
      const entry = {
        key: p.key,
        name: (p.name || parts[0] || 'Plan').toString().trim(),
        price: (p.price || (parts[1] || '')).toString().trim(),
        summary: p.summary || '',
        features: Array.isArray(p.features) ? p.features : [],
      };
      details[id] = entry;
      if (p.key) details[p.key] = entry;
    }
    planDetailsById.value = details;

    const resolved = resolveCurrentPlanId();
    if (resolved) {
      selectedPrice.value = resolved;
      if (!prices.value.find(p => p.id === resolved)) {
        prices.value.push({ id: resolved, priceId: resolved, label: planLabel.value || resolved, key: resolved, name: planLabel.value || resolved });
        planDetailsById.value[resolved] = { key: resolved, name: planLabel.value || resolved, price: '', summary: '', features: [] };
      }
    }
  } catch (err) {
    console.error('Failed to load plans', err);
    const fallbackId = resolveCurrentPlanId();
    if (fallbackId) {
      prices.value = [{ id: fallbackId, priceId: fallbackId, label: planLabel.value || fallbackId, key: fallbackId, name: planLabel.value || fallbackId }];
      planDetailsById.value[fallbackId] = { key: fallbackId, name: planLabel.value || fallbackId, price: '', summary: '', features: [] };
      selectedPrice.value = fallbackId;
    }
  }
}

// Load plans from server and populate prices + details map
onMounted(async () => {
  await loadPlansAndSelect()
});

// Keep dropdown selection in sync when billing summary arrives/changes
watch(
  () => billingSummary.value?.priceId,
  (pid) => {
    if (!pid) return
    selectedPrice.value = String(pid)
  }
)

// Keep billing admin dropdown pre-filled with current admin from summary
watch(
  () => billingSummary.value && billingSummary.value.billingAdmin && (billingSummary.value.billingAdmin.userId || billingSummary.value.billingAdmin.email),
  (val) => {
    if (!val) return
    const currentUid = String(billingSummary.value.billingAdmin.userId || '')
    const currentEmail = String(billingSummary.value.billingAdmin.email || '')
    const team = billingAdminOptions.value || []
    const byId = currentUid ? team.find((m: any) => String(m._id) === currentUid) : null
    const byEmail = currentEmail ? team.find((m: any) => String(m.email) === currentEmail) : null
    if (byId && byId._id) {
      billingAdminUserId.value = String(byId._id)
    } else if (byEmail && byEmail.email) {
      billingAdminUserId.value = String(byEmail.email)
    } else if (currentUid) {
      billingAdminUserId.value = currentUid
    } else if (currentEmail) {
      billingAdminUserId.value = currentEmail
    }
  }
)

// Also sync when project plan/tier changes
watch(
  () => project.value && (project.value.stripePriceId || project.value.subscriptionTier),
  () => {
    const resolved = resolveCurrentPlanId()
    if (resolved) selectedPrice.value = resolved
  }
)

// If dropdown is empty but plan info exists, try reloading plans when billing summary arrives
watch(
  () => billingSummary.value,
  async (val) => {
    if ((!prices.value || prices.value.length === 0) && val) {
      await loadPlansAndSelect()
    }
  }
)

// Determine trial end date: prefer Stripe's current period end if trialing; else compute from trialStartedAt + 15 days
const trialEndDate = computed(() => {
  if (!project.value) return null
  // Prefer explicit fixed trialEnd stored on the project when available
  if (project.value.trialEnd) {
  try { return new Date(project.value.trialEnd).toISOString() } catch (e) { /* ignore */ }
  }
  // If Stripe has a current period end and status is trialing, prefer that timestamp
  if ((project.value.stripeSubscriptionStatus === 'trialing') && project.value.stripeCurrentPeriodEnd) {
  try { return new Date(project.value.stripeCurrentPeriodEnd).toISOString() } catch (e) { /* ignore */ }
  }
  // Otherwise, compute from project.trialStartedAt if present
  const started = project.value.trialStartedAt ? new Date(project.value.trialStartedAt) : null
  if (!started || isNaN(started.getTime())) return null
  const endMs = started.getTime() + (15 * 24 * 60 * 60 * 1000)
  return new Date(endMs).toISOString()
})

const trialDaysLeft = computed(() => {
  if (!trialEndDate.value) return 0
  const end = new Date(trialEndDate.value).getTime()
  const diff = Math.ceil((end - Date.now()) / (1000*60*60*24))
  return Math.max(diff, 0)
})

async function refreshProject() {
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id));
    if (!pid) return;
    const prevRoleTemplates = project.value && Array.isArray(project.value.roleTemplates) ? project.value.roleTemplates.slice() : (Array.isArray(roleTemplates.value) ? roleTemplates.value.slice() : [])
    const p = await projectStore.fetchProject(String(pid));
    // If backend returned no roleTemplates (possible due to permissions), preserve existing local templates
    if (!Array.isArray(p.roleTemplates) || p.roleTemplates.length === 0) {
      p.roleTemplates = prevRoleTemplates.slice()
    }
    project.value = { ...p };
    // Keep the UI list in sync with authoritative project data when it includes roles
    if (Array.isArray(p.roleTemplates) && p.roleTemplates.length > 0) {
      roleTemplatesView.value = p.roleTemplates.slice()
    }
    try {
      const role = String((authStore.user && authStore.user.role) || '').toLowerCase()
      if (role === 'globaladmin' || role === 'superadmin') {
        await fetchRoleTemplates()
      }
    } catch (e) { /* ignore */ }
  } catch (err) {
    console.error('refreshProject error', err);
  }
}

// when project loads, default the select to the project's saved stripePriceId or tier
watch(project, (pv) => {
  if (!pv) return;
  const resolved = resolveCurrentPlanId()
  if (resolved) selectedPrice.value = resolved
}, { immediate: true });

async function startCheckout() {
  loading.value = true;
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id));
  console.log('startCheckout -> sending', { projectId: pid, priceId: selectedPrice.value, url: apiUrl('/api/stripe/create-checkout-session') });
    if (!pid) {
      ui.showError('No project selected');
      loading.value = false;
      return;
    }
    
    const { data } = await http.post('/api/stripe/create-checkout-session', {
      projectId: pid,
      priceId: resolvePriceId(String(selectedPrice.value)),
      promotionCode: promotionCode.value || undefined,
    }, { headers: getAuthHeaders() });
    if (data && data.url) {
      ui.showSuccess('Redirecting to checkout...')
      window.location.href = data.url;
    } else {
      ui.showError('Failed to start checkout');
    }
  } catch (err: any) {
    console.error('startCheckout error', err);
    ui.showError(err?.response?.data?.error || 'Failed to start checkout');
  } finally {
    loading.value = false;
  }
}

async function openBillingPortal() {
  loading.value = true;
  try {
  console.log('openBillingPortal -> sending to', apiUrl('/api/stripe/portal-session'));
    const pid = String(project.value?.id || project.value?._id || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '')
    const { data } = await http.post('/api/stripe/portal-session', { projectId: pid }, { headers: getAuthHeaders() });
    if (data && data.url) {
      ui.showSuccess('Opening billing portal...')
      window.location.href = data.url;
    } else {
      ui.showError('Failed to open billing portal');
    }
  } catch (err: any) {
    console.error('openBillingPortal error', err);
    ui.showError(err?.response?.data?.error || 'Failed to open billing portal');
  } finally {
    loading.value = false;
  }
}
</script>
