<template>
  <section class="space-y-6 relative">
    <!-- global Toast is mounted in App.vue; toasts will be triggered via the ui store -->

    <div>
      <BreadCrumbs :items="[{ text: 'Dashboard', to: '/' }, { text: 'Projects', to: '/projects' }, { text: 'Edit Project', to: '#' }]" />
    </div>

    <div class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10">
      <div class="mt-4">
        <!-- Top tabs (evenly spaced) -->
        <div class="flex w-full mb-4 border-b border-white/10 pb-3">
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

        <div>
          <div
            v-if="!project"
            class="p-4 text-white/70"
          >
            Loading project...
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
                      <!-- Status badge (invited, rejected, active, etc.) -->
                      <div
                        v-if="member.status || member.inviteStatus"
                        :class="['text-xs px-2 py-1 rounded', statusBadgeClass(member.status || member.inviteStatus)]"
                      >
                        {{ (member.status || member.inviteStatus) ? (member.status || member.inviteStatus) : 'status' }}
                      </div>
                      <div class="flex gap-2">
                        <button
                          v-if="isProjectAdmin"
                          class="px-3 py-1 rounded bg-white/6"
                          @click.prevent="openPermsModal(member)"
                        >
                          Permissions
                        </button>
                        <button
                          class="px-3 py-1 rounded bg-red-500/20 text-red-400"
                          @click="removeMember(member)"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

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
                        <template v-if="roleTemplates && roleTemplates.length">
                          <option
                            v-for="rt in roleTemplates"
                            :key="rt._id || rt.id"
                            :value="rt.name"
                          >
                            {{ rt.name }}
                          </option>
                        </template>
                        <template v-else>
                          <option value="admin">
                            admin
                          </option>
                          <option value="CxA">
                            CxA
                          </option>
                          <option value="GC">
                            GC
                          </option>
                          <option value="CM">
                            CM
                          </option>
                          <option value="Architect">
                            Architect
                          </option>
                          <option value="Designer">
                            Designer
                          </option>
                          <option value="Mechanical Contractor">
                            Mechanical Contractor
                          </option>
                          <option value="Electrical Contractor">
                            Electrical Contractor
                          </option>
                          <option value="Plumbing Contractor">
                            Plumbing Contractor
                          </option>
                          <option value="Controls Contractor">
                            Controls Contractor
                          </option>
                          <option value="Life Safety Contractor">
                            Life Safety Contractor
                          </option>
                          <option value="Other Contractor">
                            Other Contractor
                          </option>
                          <option value="Client">
                            Client
                          </option>
                          <option value="User">
                            User
                          </option>
                        </template>
                      </select>
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
              <h3 class="text-md font-medium mb-2">
                Subscription
              </h3>
              <div class="space-y-6">
                <h2 class="text-xl font-semibold">
                  Project Billing
                </h2>

                <div class="p-4 rounded-lg border">
                  <p><strong>Status:</strong> {{ status }}</p>
                  <p class="mt-2">
                    <strong>Plan:</strong> {{ planLabel }}
                  </p>
                  <p v-if="project.stripeCurrentPeriodEnd">
                    <strong>Current period end:</strong>
                    {{ new Date(project.stripeCurrentPeriodEnd).toLocaleString() }}
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
                </div>

                <div class="p-4 rounded-lg border">
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
                      :disabled="loading"
                      class="px-4 py-2 rounded bg-blue-600 text-white"
                      @click="startCheckout"
                    >
                      {{ loading ? '...' : 'Subscribe / Update' }}
                    </button>

                    

                    <button
                      :disabled="loading"
                      class="px-4 py-2 rounded border"
                      @click="openBillingPortal"
                    >
                      Manage billing
                    </button>
                  </div>
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
              <div class="rounded p-3 bg-white/5">
                <label class="flex items-center gap-2"><input
                  v-model="project.settingsEnabled"
                  type="checkbox"
                > Enable special behavior</label>
                <div class="mt-4">
                  <label class="block text-white/80 mb-1">Tags (comma separated)</label>
                  <input
                    v-model="tagsText"
                    class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"
                  >
                </div>
                <div class="mt-4">
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
                    This setting controls how search filters work across list pages (Issues, Projects, Spaces, Activities).
                  </p>
                </div>
                <div class="mt-4">
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
              
                <!-- Roles card: project-scoped role templates -->
                <div
                  class="mt-6 rounded p-3 bg-white/5"
                >
                  <div class="flex items-center justify-between mb-3">
                    <div class="font-medium">
                      Roles
                    </div>
                    <div>
                      <button
                        v-if="isProjectAdmin"
                        aria-label="Create role template"
                        class="w-10 h-10 grid place-items-center rounded-lg bg-emerald-500 text-white border border-white/8 hover:bg-emerald-600"
                        @click="openRoleModal(null)"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          class="w-5 h-5"
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
                    </div>
                  </div>
                  <div
                    v-if="!(project && (project.roleTemplates && project.roleTemplates.length))"
                    class="text-sm text-white/70"
                  >
                    No project role templates.
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="rt in (project && project.roleTemplates ? project.roleTemplates : roleTemplates)"
                      :key="rt._id || rt.id"
                      class="p-1 rounded"
                    >
                      <div
                        class="p-3 rounded bg-white/6 cursor-pointer"
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
                                v-if="isProjectAdmin"
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
                                v-if="isProjectAdmin"
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
                        class="mt-2 p-3 rounded bg-white/5"
                      >
                        <div class="grid grid-cols-2 gap-3 max-h-[260px] overflow-auto text-sm text-white/80">
                          <div
                            v-for="(ops, resource) in permMatrix"
                            :key="resource"
                            class="p-2 rounded"
                          >
                            <div class="font-medium text-white mb-2">
                              {{ resource }}
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
                            v-if="isProjectAdmin"
                            class="px-3 py-1 rounded bg-white/6 mr-2"
                            @click="cancelRoleEdits(rt._id || rt.id, rt)"
                          >
                            Cancel
                          </button>
                          <button
                            v-if="isProjectAdmin"
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
            </div>

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
                      :key="t"
                      :value="t"
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
                <button
                  class="px-3 py-2 rounded bg-white/10 border border-white/20"
                  @click="loadMore"
                >
                  Load more ({{ logsLimit + 200 }})
                </button>
                <button
                  class="ml-auto px-3 py-2 rounded bg-white/10 border border-white/20"
                  @click="exportCsv"
                >
                  Export CSV
                </button>
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
      </div>
    </div>
  </section>
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
            {{ resource }}
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
          class="px-3 py-1 rounded bg-white/6 mr-2"
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
  <PermissionsModal
    :visible="showPermsModal"
    :member="modalMember"
    :project-id="projectId"
    :role-templates="(project && project.roleTemplates) ? project.roleTemplates : roleTemplates"
    @close="closePermsModal"
    @saved="onMemberPermissionsSaved"
  />
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import ProjectForm from '../../components/ProjectForm.vue'
import Modal from '../../components/Modal.vue'
import { useUiStore } from '../../stores/ui'
import { useProjectStore } from '../../stores/project'
import { useRoute, useRouter } from 'vue-router'
import http from '../../utils/http'
import { apiUrl } from '../../utils/api'
import { getAuthHeaders } from '../../utils/auth'
import PermissionsModal from '../../components/PermissionsModal.vue'
// inlineConfirm removed (unused in this file)

const projectStore = useProjectStore()
const route = useRoute()
const router = useRouter()

const projectId = route.params.id || route.query.id || null
const project = ref(null)
const activeTab = ref('info')
const logs = ref([])
const logsSearch = ref('')
const selectedType = ref('')
const startDateText = ref('')
const endDateText = ref('')
const logsLimit = ref(200)
const formErrors = ref({})
const ui = useUiStore()
const clientFileInput = ref(null)
const cxaFileInput = ref(null)
const newMember = ref({ email: '', firstName: '', lastName: '', company: '', role: 'User' })
const invites = ref([])
const roleTemplates = ref([])
const authStore = useAuthStore()

// Modal-based permissions editor state & handlers
const showPermsModal = ref(false)
const modalMember = ref(null)

function openPermsModal(member) {
  modalMember.value = member
  showPermsModal.value = true
}

function closePermsModal() {
  modalMember.value = null
  showPermsModal.value = false
}

async function onMemberPermissionsSaved() {
  try {
    await refreshProject()
    ui.showSuccess('Member permissions updated')
  } catch (err) {
    console.error('onMemberPermissionsSaved error', err)
  }
  closePermsModal()
}

// Role template editor modal state & handlers
const showRoleModal = ref(false)
const editingRoleTemplate = ref({ name: '', description: '', permissionsText: '' })
const selectedRolePerms = ref(new Set())
const permMatrix = {
  issues: ['create', 'read', 'update', 'delete'],
  activities: ['create', 'read', 'update', 'delete'],
  equipment: ['create', 'read', 'update', 'delete'],
  projects: ['create', 'read', 'update', 'delete']
}

// Accordion state for role templates in the Settings card
const openRoles = ref(new Set())

const selectedRolePermsArray = computed({
  get() { return Array.from(selectedRolePerms.value) },
  set(v) { selectedRolePerms.value = new Set(Array.isArray(v) ? v : []) }
})

// Inline editing state for role templates
const roleEdits = ref({}) // map roleId -> Set

function getTemplateById(id) {
  try {
    const list = (project.value && project.value.roleTemplates) ? project.value.roleTemplates : roleTemplates.value
    return (Array.isArray(list) ? list : []).find(r => (r && ((r._id || r.id) === id))) || null
  } catch (e) { return null }
}

function toggleRoleOpen(id) {
  try {
    if (!id) return
    const s = new Set(openRoles.value)
    if (s.has(id)) s.delete(id)
    else {
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

function isRoleOpen(id) {
  try { return openRoles.value.has(id) } catch (e) { return false }
}

function isPermChecked(roleId, perm) {
  try {
    const s = roleEdits.value[roleId]
    if (s) return s.has(perm)
    const tpl = getTemplateById(roleId)
    return Array.isArray(tpl?.permissions) && tpl.permissions.includes(perm)
  } catch (e) { return false }
}

function togglePerm(roleId, perm) {
  try {
    const current = roleEdits.value[roleId] || new Set()
    const s = new Set(current)
    if (s.has(perm)) s.delete(perm)
    else s.add(perm)
    roleEdits.value = Object.assign({}, roleEdits.value, { [roleId]: s })
  } catch (e) { /* ignore */ }
}

function hasRoleChanges(roleId, tpl) {
  try {
    const s = roleEdits.value[roleId]
    if (!s) return false
    const orig = Array.isArray(tpl?.permissions) ? tpl.permissions : []
    const a = Array.from(s).sort()
    const b = Array.from(new Set(orig)).sort()
    return JSON.stringify(a) !== JSON.stringify(b)
  } catch (e) { return false }
}

function cancelRoleEdits(roleId, tpl) {
  try {
    const perms = Array.isArray(tpl?.permissions) ? tpl.permissions : []
    roleEdits.value = Object.assign({}, roleEdits.value, { [roleId]: new Set(perms) })
  } catch (e) { /* ignore */ }
}

async function saveRoleInline(tpl) {
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
      const updated = resp && resp.data && resp.data.roleTemplate ? resp.data.roleTemplate : null
      if (updated && project.value && Array.isArray(project.value.roleTemplates)) {
        const list = project.value.roleTemplates.slice()
        const idx = list.findIndex(r => (r && ((r._id || r.id) === id)))
        if (idx >= 0) list.splice(idx, 1, updated)
        else list.unshift(updated)
        project.value.roleTemplates = list
      }
      if (updated && Array.isArray(roleTemplates.value)) {
        const g = roleTemplates.value.slice()
        const gi = g.findIndex(r => (r && ((r._id || r.id) === id)))
        if (gi >= 0) g.splice(gi, 1, updated)
        else g.unshift(updated)
        roleTemplates.value = g
      }
    } catch (e) { /* ignore */ }
    try { await refreshProject() } catch (e) { /* ignore */ }
  } catch (err) {
    console.error('saveRoleInline error', err)
    ui.showError(err?.response?.data?.error || 'Failed to save role')
  }
}

function openRoleModal(template) {
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
        const updated = resp && resp.data && resp.data.roleTemplate ? resp.data.roleTemplate : null
        if (updated) {
          const list = project.value && Array.isArray(project.value.roleTemplates) ? project.value.roleTemplates : []
          const idx = list.findIndex(r => (r && ((r._id || r.id) === (updated._id || updated.id))))
          if (idx >= 0) list.splice(idx, 1, updated)
          else list.push(updated)
          // ensure reactive update
          if (project.value) project.value.roleTemplates = list
        }
      } catch (e) { /* ignore local update errors */ }
    } else {
      const resp = await http.post(`/api/projects/${pid}/roles`, body, { headers: getAuthHeaders() })
      ui.showSuccess('Role template created')
      // Insert created role into local project roleTemplates so it shows immediately
      try {
        const created = resp && resp.data && resp.data.roleTemplate ? resp.data.roleTemplate : null
        if (created) {
          const list = project.value && Array.isArray(project.value.roleTemplates) ? project.value.roleTemplates.slice() : []
          list.unshift(created)
          if (project.value) project.value.roleTemplates = list
        }
      } catch (e) { /* ignore */ }
    }
    // attempt to refresh from server but don't rely on it for immediate UI
    try { await refreshProject() } catch (e) { /* ignore */ }
    closeRoleModal()
  } catch (err) {
    console.error('saveRoleTemplate error', err)
    ui.showError(err?.response?.data?.error || 'Failed to save role template')
  }
}

async function deleteRoleTemplate(tpl) {
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
        if (project.value && Array.isArray(project.value.roleTemplates)) {
          project.value.roleTemplates = project.value.roleTemplates.filter(r => ((r._id || r.id) !== id))
        }
        // also update global roleTemplates cache if present
        if (Array.isArray(roleTemplates.value)) roleTemplates.value = roleTemplates.value.filter(r => ((r._id || r.id) !== id))
      } catch (e) { /* ignore */ }
      try { await refreshProject() } catch (e) { /* ignore */ }
      closeRoleModal()
  } catch (err) {
    console.error('deleteRoleTemplate error', err)
    ui.showError(err?.response?.data?.error || 'Failed to delete role template')
  }
}

async function fetchRoleTemplates() {
  try {
    // Try loading global and project-scoped role templates. This endpoint is admin-protected;
    // non-admin users will get a 403 and we silently fall back to the legacy hard-coded list.
    const pid = projectId || (project.value && (project.value._id || project.value.id))
  const globalResp = await http.get('/api/admin/roles?scope=global', { headers: getAuthHeaders() })
    let list = Array.isArray(globalResp.data) ? globalResp.data : []
    if (pid) {
      try {
  const resp = await http.get(`/api/admin/roles?scope=project&projectId=${pid}`, { headers: getAuthHeaders() })
        if (Array.isArray(resp.data)) list = list.concat(resp.data)
      } catch (e) {
        // ignore project-scoped fetch failures (likely permission)
      }
    }
    roleTemplates.value = Array.isArray(list) ? list : []
  } catch (e) {
    // unable to load templates (likely not an admin) — leave roleTemplates empty
    roleTemplates.value = []
  }
}

const selectedRoleTemplate = computed(() => {
  try {
    const rv = roleTemplates.value || []
    return rv.find(r => r && (r.name === (newMember.value.role || '')) ) || null
  } catch (e) { return null }
})
// Determine whether current auth user is a project admin (team role 'admin' or 'CxA')
const currentProjectMember = computed(() => {
  try {
    const me = authStore.user
    if (!me || !project.value || !Array.isArray(project.value.team)) return null
    return project.value.team.find((t) => (String(t._id) === String(me._id) || String((t.email || '')).toLowerCase() === String((me.email || '')).toLowerCase())) || null
  } catch (e) { return null }
})

const isProjectAdmin = computed(() => {
  const m = currentProjectMember.value
  if (!m) return false
  const r = String(m.role || '').toLowerCase()
  return r === 'admin' || r === 'cxa' || r === 'cxa' || r === 'cxa'
})
// use auth store token; fall back to localStorage if necessary

const tagsText = computed({
  get() { return (project.value && Array.isArray(project.value.tags)) ? project.value.tags.join(', ') : '' },
  set(v) { if (project.value) project.value.tags = v.split(',').map(s => s.trim()).filter(Boolean) }
})

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

function tabClass(t) {
  return activeTab.value === t ? 'bg-white/10 text-white font-medium' : 'bg-white/5 text-white/80'
}

// local showToast removed; use `ui.showSuccess` / `ui.showError` instead

onMounted(async () => {
  if (projectId) {
    try {
      const p = await projectStore.fetchProject(projectId)
      project.value = { ...p }
      if (!project.value.searchMode) project.value.searchMode = 'substring'
      // attempt to load role templates for richer role selection (admins only)
      try { await fetchRoleTemplates() } catch (e) { /* ignore */ }
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
    watch(projectStore.currentProject, (nv) => {
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
    await refreshProject();
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
  } catch (err) {
    console.error('loadInvites error', err)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function resendInvite(inviteId) {
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id));
    if (!pid) return ui.showError('No project selected')
  await http.post(`/api/projects/${pid}/resend-invite`, { inviteId }, { headers: getAuthHeaders() })
    ui.showSuccess('Invitation resent')
    // reload invites to update timestamps
    await loadInvites()
  } catch (err) {
    console.error('resendInvite error', err)
    ui.showError(err?.response?.data?.error || 'Failed to resend invite')
  }
}

function fmt(d) { try { return d ? new Date(d).toLocaleString() : '' } catch (e) { return String(d || '') } }
const allTypes = computed(() => {
  const set = new Set()
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
  const opts = { limit: logsLimit.value }
    if (selectedType.value) opts.type = selectedType.value
    const list = await projectStore.fetchProjectLogs(String(pid), opts)
    logs.value = Array.isArray(list) ? list : []
  } catch (err) {
    // noop
  }
}

function loadMore() {
  logsLimit.value += 200
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

// Lazy-load logs when tab is opened
watch(activeTab, (t) => { if (t === 'logs' && !logs.value.length) loadLogs() })
// Reload logs when type filter changes (server-side filter), reset limit
watch(selectedType, () => { logsLimit.value = 200; loadLogs() })

function removeMember(m) {
  project.value.team = (project.value.team || []).filter(tm => (tm._id || tm.email) !== (m._id || m.email))
}

function statusBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'invited' || s === 'pending') return 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
  if (s === 'rejected' || s === 'declined') return 'bg-gray-600/20 text-gray-200 border border-gray-600/30'
  if (s === 'active' || s === 'accepted' || s === 'member') return 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
  return 'bg-white/6 text-white/80 border border-white/10'
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
  } catch (err) {
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

async function onClientLogoSelected(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  // quick client-side preview
  const reader = new FileReader()
  reader.onload = async (ev) => {
    project.value.logo = ev.target.result
    try {
      await projectStore.updateProject({ ...project.value })
      ui.showSuccess('Client logo saved')
    } catch (err) {
      ui.showError('Failed to save client logo')
    }
  }
  reader.readAsDataURL(f)
}

async function onCxaLogoSelected(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  ensureCommissioningAgent()
  const reader = new FileReader()
  reader.onload = async (ev) => {
    project.value.commissioning_agent.logo = ev.target.result
    try {
      await projectStore.updateProject({ ...project.value })
      ui.showSuccess('Commissioning Agent logo saved')
    } catch (err) {
      ui.showError('Failed to save CxA logo')
    }
  }
  reader.readAsDataURL(f)
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
    await projectStore.updateProject(project.value)
    ui.showSuccess('Saved')
  } catch (e) {
    ui.showError('Failed to save')
  } finally {
    saving.value = false
  }
}

// Your three monthly plan price IDs:
const prices = ref([]);
const selectedPrice = ref(null);
const loading = ref(false);

const status = computed(() => project.value?.stripeSubscriptionStatus || project.value?.status || 'trialing');
const planLabel = computed(() => {
  const id = project.value?.stripePriceId || selectedPrice.value;
  const p = (prices.value || []).find(x => x.id === id);
  return p ? p.label : (id || 'No plan');
});

// Plan details shown in the UI when a selection is made
const planDetailsById = ref({});

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

// Load plans from server and populate prices + details map
onMounted(async () => {
  try {
  const { data } = await http.get('/api/plans');
    const list = Array.isArray(data) ? data : [];
    prices.value = list.map(p => ({ id: p.priceId, label: p.label, key: p.key }));
    const details = {};
    for (const p of list) {
      // Derive name/price from label if not provided separately
      const parts = String(p.label || '').split('–');
      details[p.priceId] = {
        key: p.key,
        name: (p.name || parts[0] || 'Plan').toString().trim(),
        price: (p.price || (parts[1] || '')).toString().trim(),
        summary: p.summary || '',
        features: Array.isArray(p.features) ? p.features : [],
      };
    }
    planDetailsById.value = details;

    // Set default selection based on project or first plan
    if (project.value && (project.value.stripePriceId)) {
      selectedPrice.value = project.value.stripePriceId;
    } else if (prices.value.length) {
      selectedPrice.value = prices.value[0].id;
    }
  } catch (err) {
    // If fails, leave prices empty; UI will handle gracefully
    console.error('Failed to load plans', err);
  }
});

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
    const p = await projectStore.fetchProject(pid);
    // If backend returned no roleTemplates (possible due to permissions), preserve existing local templates
    if (!Array.isArray(p.roleTemplates) || p.roleTemplates.length === 0) {
      p.roleTemplates = prevRoleTemplates.slice()
    }
    project.value = { ...p };
    try { await fetchRoleTemplates() } catch (e) { /* ignore */ }
  } catch (err) {
    console.error('refreshProject error', err);
  }
}

// when project loads, default the select to the project's saved stripePriceId
watch(project, (pv) => {
  if (!pv) return;
  selectedPrice.value = pv.stripePriceId || ((prices.value && prices.value[0] && prices.value[0].id) || null);
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
      priceId: selectedPrice.value,
    }, { headers: getAuthHeaders() });
    if (data && data.url) {
      ui.showSuccess('Redirecting to checkout...')
      window.location.href = data.url;
    } else {
      ui.showError('Failed to start checkout');
    }
  } catch (err) {
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
    const { data } = await http.post('/api/stripe/portal-session', {}, { headers: getAuthHeaders() });
    if (data && data.url) {
      ui.showSuccess('Opening billing portal...')
      window.location.href = data.url;
    } else {
      ui.showError('Failed to open billing portal');
    }
  } catch (err) {
    console.error('openBillingPortal error', err);
    ui.showError(err?.response?.data?.error || 'Failed to open billing portal');
  } finally {
    loading.value = false;
  }
}
</script>
