<template>
  <section class="">
    <div class="w-full mb-4">
      <BreadCrumbs
        :items="crumbs"
        title="Profile"
      />
    </div>

    <div class="w-full rounded-2xl p-6 bg-white/6 backdrop-blur-xl border border-white/10">
      <!-- Tabs -->
      <div class="mb-6">
        <div
          role="tablist"
          class="relative flex items-center w-full"
        >
          <!-- animated indicator -->
          <div
            class="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-in-out"
            :style="{ left: tabLeft + '%', width: tabWidth + '%' }"
          />
          <button
            v-for="t in tabs"
            :key="t"
            :aria-selected="currentTab === t"
            role="tab"
            class="flex-1 text-center px-3 py-2 text-sm flex items-center justify-center gap-2"
            :class="currentTab === t
              ? 'text-white border-b-2 border-white rounded-t-md bg-white/6'
              : 'text-white/70 hover:text-white/90'"
            @click="currentTab = t"
          >
            <!-- Icons per tab -->
            <svg
              v-if="t === 'Info'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 text-white/90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM4 20v-1a4 4 0 014-4h8a4 4 0 014 4v1"
            /></svg>
            <svg
              v-else-if="t === 'Change Password'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 text-white/90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4 9 5.567 9 7.5 10.343 11 12 11zM6 20v-1a4 4 0 014-4h4a4 4 0 014 4v1"
            /></svg>
            <svg
              v-else-if="t === 'Avatar'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 text-white/90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><path
              d="M21 19V7a2 2 0 0 0-2-2h-3l-2-2H10L8 5H5a2 2 0 0 0-2 2v10"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /><circle
              cx="12"
              cy="13"
              r="3"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /></svg>
            <svg
              v-else-if="t === 'Projects'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 text-white/90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><rect
              x="3"
              y="7"
              width="18"
              height="13"
              rx="2"
              ry="2"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /><path
              d="M16 3v4"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /></svg>
            <svg
              v-else-if="t === 'Settings'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 text-white/90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><path
              d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /><path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 2.27 17.4l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82L4.27 3.24A2 2 0 1 1 7.1.41l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V0a2 2 0 1 1 4 0v.09c.12.6.57 1.09 1.17 1.37l.06.03A2 2 0 1 1 19.73 3.6l-.06.06a1.65 1.65 0 0 0-.33 1.82V6c.46.1.9.34 1.2.64.3.3.54.74.64 1.2H21a2 2 0 1 1 0 4h-.09c-.6.12-1.09.57-1.37 1.17l-.03.06z"
              stroke-width="1"
              stroke-linecap="round"
              stroke-linejoin="round"
            /></svg>
            <span>{{ t }}</span>
          </button>
        </div>
      </div>

      <!-- Local Toast removed; global UI toast is rendered by App.vue using the UI store -->

      <div>
        <div v-if="currentTab === 'Info'">
          <form
            class="space-y-6"
            @submit.prevent="save"
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-white/80 mb-1">First name</label>
                <input
                  v-model="local.firstName"
                  class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"
                >
                <p
                  v-if="errors.firstName"
                  class="text-sm text-red-400 mt-1"
                >
                  {{ errors.firstName }}
                </p>
              </div>

              <div>
                <label class="block text-white/80 mb-1">Last name</label>
                <input
                  v-model="local.lastName"
                  class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"
                >
                <p
                  v-if="errors.lastName"
                  class="text-sm text-red-400 mt-1"
                >
                  {{ errors.lastName }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-white/80 mb-1">Role</label>
                <select
                  v-model="local.role"
                  class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"
                >
                  <option value="user">
                    User
                  </option>
                  <option value="manager">
                    Manager
                  </option>
                  <option value="admin">
                    Admin
                  </option>
                  <option value="globaladmin">
                    Global Admin
                  </option>
                  <option value="superadmin">
                    Super Admin
                  </option>
                  <option value="viewer">
                    Viewer
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-white/80 mb-1">Company</label>
                <input
                  v-model="local.contact.company"
                  class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"
                >
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-white/80 mb-1">Phone</label>
                <input
                  v-model="local.contact.phone"
                  class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"
                >
              </div>

              <div>
                <label class="block text-white/80 mb-1">Email</label>
                <input
                  v-model="local.email"
                  type="email"
                  class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"
                >
                <p
                  v-if="errors.email"
                  class="text-sm text-red-400 mt-1"
                >
                  {{ errors.email }}
                </p>
              </div>
            </div>

            <!-- Address: Street, City, State, Zip, Country. City/State/Zip display on one row at >=sm -->
            <div>
              <label class="block text-white/80 mb-1">Address</label>
              <input
                v-model="local.contact.address.street"
                placeholder="Street"
                class="w-full rounded-lg mb-2 p-2 bg-white/5 border border-white/10 text-white"
              >

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  v-model="local.contact.address.city"
                  placeholder="City"
                  class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"
                >
                <input
                  v-model="local.contact.address.state"
                  placeholder="State"
                  class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"
                >
                <input
                  v-model="local.contact.address.zip"
                  placeholder="Zip"
                  class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"
                >
              </div>

              <input
                v-model="local.contact.address.country"
                placeholder="Country"
                class="w-full rounded-lg mt-2 p-2 bg-white/5 border border-white/10 text-white"
              >
            </div>

            <div>
              <label class="block text-white/80 mb-1">Bio</label>
              <textarea
                v-model="local.contact.bio"
                rows="3"
                class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"
              />
            </div>

            <div class="flex items-center gap-3">
              <button
                type="submit"
                :disabled="saving"
                class="px-4 py-2 rounded-lg bg-white/6 text-white flex items-center"
                :class="saving ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/10'"
                aria-busy="saving"
              >
                <svg
                  v-if="saving"
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4 mr-2 animate-spin text-white/90"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Save
              </button>
              <button
                type="button"
                class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
                @click="reset"
              >
                Cancel
              </button>
              <div
                v-if="status"
                class="ml-auto text-white/80"
              >
                {{ status }}
              </div>
            </div>
          </form>
        </div>

        <div
          v-else-if="currentTab === 'Change Password'"
          class="space-y-4"
        >
          <p class="text-white/80">
            Change your account password.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-white/80 mb-1">Email</label>
              <input
                :value="auth.user?.email || ''"
                disabled
                class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white/50"
              >
            </div>
            <div>
              <label class="block text-white/80 mb-1">Current password</label>
              <input
                v-model="pwd.current"
                type="password"
                class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"
              >
              <p
                v-if="pwdErrors.current"
                class="text-sm text-red-400 mt-1"
              >
                {{ pwdErrors.current }}
              </p>
            </div>
            <div>
              <label class="block text-white/80 mb-1">New password</label>
              <input
                v-model="pwd.new"
                type="password"
                class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"
              >
              <p
                v-if="pwdErrors.new"
                class="text-sm text-red-400 mt-1"
              >
                {{ pwdErrors.new }}
              </p>
            </div>
            <div>
              <label class="block text-white/80 mb-1">Confirm new password</label>
              <input
                v-model="pwd.confirm"
                type="password"
                class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"
              >
              <p
                v-if="pwdErrors.confirm"
                class="text-sm text-red-400 mt-1"
              >
                {{ pwdErrors.confirm }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button
              :disabled="pwdSaving"
              class="px-4 py-2 rounded-lg bg-white/6 text-white"
              :class="pwdSaving ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/10'"
              @click="changePasswordHandler"
            >
              Update password
            </button>
            <div
              v-if="pwdStatus"
              class="ml-4 text-white/80"
            >
              {{ pwdStatus }}
            </div>
          </div>
        </div>

        <div
          v-else-if="currentTab === 'Avatar'"
          class="space-y-4"
        >
          <p class="text-white/80">
            Upload or change your avatar.
          </p>

          <div class="flex items-start gap-6">
            <div class="w-28 h-28 rounded-full overflow-hidden bg-white/6 flex items-center justify-center">
              <img
                v-if="preview || local.avatar"
                :src="preview || local.avatar"
                alt="avatar preview"
                class="w-full h-full object-cover"
              >
              <div
                v-else
                class="text-white/70"
              >
                No avatar
              </div>
            </div>

            <div class="flex-1">
              <label class="block text-white/80 mb-2">Choose image</label>
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="text-white/70"
                @change="onFileChange"
              >

              <div class="mt-4 flex items-center gap-3">
                <button
                  :disabled="!preview"
                  class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
                  :class="!preview ? 'opacity-50 cursor-not-allowed' : ''"
                  @click="startCrop"
                >
                  Crop
                </button>
                <button
                  v-if="isCropping"
                  class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
                  @click="applyCrop"
                >
                  Apply Crop
                </button>
                <button
                  v-if="isCropping"
                  class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
                  @click="cancelCrop"
                >
                  Cancel Crop
                </button>
                <button
                  v-else
                  :disabled="!preview"
                  class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
                  :class="!preview ? 'opacity-50 cursor-not-allowed' : ''"
                  @click="uploadAvatar"
                >
                  Upload
                </button>
                <button
                  :disabled="!local.avatar && !preview"
                  class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
                  @click="removeAvatar"
                >
                  Remove
                </button>
                <div
                  v-if="avatarStatus"
                  class="ml-4 text-white/80"
                >
                  {{ avatarStatus }}
                </div>
              </div>
            </div>
          </div>

          <!-- Cropping area -->
          <div
            v-if="preview && isCropping"
            class="mt-6"
          >
            <div class="flex flex-col md:flex-row gap-4">
              <div class="relative bg-black/10 p-2 rounded">
                <div
                  ref="previewContainer"
                  class="relative"
                  style="width:320px;height:320px;overflow:hidden;"
                >
                  <img
                    ref="cropImage"
                    :src="preview"
                    alt="to crop"
                    class="w-full h-full object-contain"
                  >
                  <!-- crop rectangle overlay -->
                  <div
                    class="absolute border-2 border-white/80 bg-white/5"
                    :style="cropRectStyle"
                    @mousedown.prevent="startDrag"
                  />
                </div>
              </div>

              <div class="flex-1">
                <label class="block text-white/80 mb-2">Crop size</label>
                <input
                  v-model.number="crop.sizePx"
                  type="range"
                  min="50"
                  :max="320"
                  class="w-full"
                >
                <div class="mt-4 text-white/80">
                  Drag the crop square to reposition. Click Apply Crop when ready.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else-if="currentTab === 'Projects'"
          class="space-y-6"
        >
          <p class="text-white/80">
            Projects you're assigned to.
          </p>

          <!-- Pending Invitations Section -->
          <div
            v-if="invitationsStore.invites.length"
            class="space-y-4"
          >
            <div class="flex items-center gap-2 text-white/90 font-medium">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                viewBox="0 0 24 24"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 12c2.21 0 4-1.79 4-4S14.21 4 12 4 8 5.79 8 8s1.79 4 4 4z"
              /><path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 20v-1a4 4 0 0 1 4-4h3"
              /><path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16 3v4m4 4h-4m4 4h-4"
              /></svg>
              <span>Pending Invitations</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="inv in invitationsStore.invites"
                :key="inv.id"
                class="rounded-xl p-4 bg-amber-500/10 border border-amber-400/30"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h3 class="text-lg font-semibold text-white">
                      {{ inv.project?.name || 'Project' }}
                    </h3>
                    <p class="text-xs text-white/70 mt-1">
                      Invited {{ formatInviteDate(inv.createdAt) }}
                    </p>
                  </div>
                  <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-400/20 text-amber-200">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      viewBox="0 0 24 24"
                    ><path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12 6v6l4 2"
                    /></svg>
                    Pending
                  </span>
                </div>
                <div class="mt-4 flex items-center justify-between text-sm text-white/80">
                  <div class="text-xs text-white/70">
                    You haven't accepted this project yet.
                  </div>
                  <button
                    class="px-3 py-1 rounded-lg bg-amber-400/30 hover:bg-amber-400/40 text-white text-sm border border-amber-400/40"
                    @click="acceptInvite(inv.id)"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Assigned Projects -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="proj in local.projects"
              :key="proj._id || proj.id"
              :class="[
                'rounded-xl p-4 border transition-shadow duration-200',
                proj.default
                  ? 'bg-white/10 backdrop-blur-sm ring-1 ring-amber-400/20 border-amber-300/30 shadow-lg'
                  : 'bg-white/5 border-white/10'
              ]"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="text-lg font-semibold text-white">
                    {{ proj.name || 'Untitled Project' }}
                  </h3>
                  <p class="text-sm text-white/80 mt-1">
                    {{ proj.client || 'No client' }} — <span class="italic">{{ proj.project_type || '—' }}</span>
                  </p>
                </div>
                <div class="text-right">
                  <span
                    v-if="proj.default"
                    class="inline-block text-xs px-2 py-1 rounded bg-white/10 text-white"
                  >Default</span>
                  <div class="text-sm text-white/70 mt-2">
                    {{ proj.status || 'Unknown' }}
                  </div>
                </div>
              </div>
              <p class="text-sm text-white/70 mt-3">
                {{ truncate(proj.description) || 'No description provided.' }}
              </p>
              <div class="mt-4 flex items-center justify-between text-sm text-white/80">
                <div>
                  <div><span class="text-white/60">Role:</span> {{ proj.role || '—' }}</div>
                  <div class="mt-1">
                    <span class="text-white/60">Location:</span> {{ proj.location || '—' }}
                  </div>
                </div>
                <div class="flex flex-col items-end gap-2">
                  <button
                    v-if="!proj.default"
                    class="px-3 py-1 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/8"
                    @click="makeDefault(proj)"
                  >
                    Select
                  </button>
                  <span
                    v-else
                    class="text-xs text-white/60"
                  >Default</span>
                  <div class="flex flex-col items-end gap-2">
                    <button
                      class="px-3 py-1 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/8"
                      @click="editProject(proj)"
                    >
                      Edit
                    </button>
                    <button
                      v-if="canLeaveProject(proj)"
                      class="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/25 text-red-300 text-sm border border-red-500/30"
                      @click="leaveProject(proj)"
                    >
                      Leave
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else-if="currentTab === 'Settings'"
          class="space-y-4"
        >
          <p class="text-white/80">
            Account settings and preferences (placeholder).
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../../stores/project'
import { useAuthStore } from '../../stores/auth'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import { useUiStore } from '../../stores/ui'
import { useInvitationsStore } from '../../stores/invitations'
import { confirm as inlineConfirm } from '../../utils/confirm'

const auth = useAuthStore()

function normalizeProjects(arr) {
  if (!Array.isArray(arr)) return []
  const out = arr.map(p => ({
    _id: p._id || p.id || null,
    name: p.name || p.title || '',
    client: p.client || '',
    role: p.role || '',
    location: p.location || '',
    project_type: p.project_type || p.projectType || '',
    status: p.status || '',
    description: p.description || p.desc || '',
    default: !!p.default
  }))
  // If there's only one project, make it the default automatically
  if (out.length === 1) {
    out[0].default = true
  }
  return out
}

const router = useRouter()
const projectStore = useProjectStore()

const local = reactive({
  firstName: auth.user?.firstName || '',
  lastName: auth.user?.lastName || '',
  email: auth.user?.email || '',
  role: auth.user?.role || 'user',
  projects: normalizeProjects(auth.user?.projects),
  contact: {
    company: auth.user?.contact?.company || '',
    phone: auth.user?.contact?.phone || '',
    address: {
      street: auth.user?.contact?.address?.street || '',
      city: auth.user?.contact?.address?.city || '',
      state: auth.user?.contact?.address?.state || '',
      zip: auth.user?.contact?.address?.zip || '',
      country: auth.user?.contact?.address?.country || '',
      taxId: auth.user?.contact?.address?.taxId || ''
    },
    bio: auth.user?.contact?.bio || '',
    avatar: auth.user?.contact?.avatar || ''
  },
  social_media: {
    linkedin: auth.user?.social_media?.linkedin || '',
    x: auth.user?.social_media?.x || '',
    github: auth.user?.social_media?.github || ''
  },
  avatar: auth.user?.avatar || auth.user?.contact?.avatar || ''
})

const crumbs = [
  { text: 'Home', to: '/' },
  { text: 'Dashboard', to: '/dashboard' },
  { text: 'Profile' }
]

const tabs = ['Info', 'Change Password', 'Avatar', 'Projects', 'Settings']
const currentTab = ref('Info')

const activeIndex = computed(() => {
  const i = tabs.indexOf(currentTab.value)
  return i >= 0 ? i : 0
})

const tabLeft = computed(() => (activeIndex.value * 100) / tabs.length)
const tabWidth = computed(() => 100 / tabs.length)

const errors = reactive({})
const status = ref('')
const saving = ref(false)
const ui = useUiStore()
const invitationsStore = useInvitationsStore()
// Alias to store toast so existing assignments continue to show the global toast
const toast = ui.toast
const fileInput = ref(null)
const preview = ref('')
const avatarStatus = ref('')
const isCropping = ref(false)
const crop = reactive({ x: 20, y: 20, sizePx: 160 })
const dragging = ref(false)
const dragStart = reactive({ x: 0, y: 0 })
const previewContainer = ref(null)
const cropImage = ref(null)

function validate() {
  errors.firstName = local.firstName ? '' : 'First name is required'
  errors.email = local.email && local.email.includes('@') ? '' : 'Valid email required'
  return !errors.firstName && !errors.email
}

function truncate(str, n = 250) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '...' : str
}

function formatInviteDate(d) {
  try { return d ? new Date(d).toLocaleDateString() : '' } catch (e) { return '' }
}

async function acceptInvite(id) {
  try {
    const pid = await invitationsStore.acceptInvite(id)
    if (pid) {
      // Optimistically push project reference into auth.user.projects if returned
      try {
        if (pid && auth.user) {
          const exists = Array.isArray(auth.user.projects) && auth.user.projects.some((p) => String((p && (p._id || p.id || p))) === String(pid))
          if (!exists) {
            // minimal object; full details will come from projectStore.fetchProjects
            auth.user.projects = [...(auth.user.projects || []), { _id: pid, role: 'user', default: false }]
            local.projects = normalizeProjects(auth.user.projects)
            try { localStorage.setItem('user', JSON.stringify(auth.user)) } catch (e) { /* ignore */ }
          }
        }
  } catch (e) { /* ignore optimistic local update errors */ }
  try { await projectStore.fetchProjects() } catch (e) { /* ignore */ }
      ui.showSuccess('Invitation accepted')
    } else {
      ui.showError(invitationsStore.error || 'Failed to accept invitation')
    }
  } catch (e) {
    ui.showError('Failed to accept invitation')
  }
}

onMounted(() => {
  // Fetch invites if not already loaded (Topbar might have loaded them)
  try { if (!invitationsStore.invites.length) invitationsStore.fetchPending() } catch (e) { /* ignore invites load race */ }
})

async function save() {
  status.value = ''
  if (!validate()) return
  saving.value = true
  const payload = {
    firstName: local.firstName,
    lastName: local.lastName,
    email: local.email,
    role: local.role,
    projects: local.projects.map(p => ({ ...p, default: p.default || local.projects.length === 1 })),
    contact: {
      company: local.contact.company,
      phone: local.contact.phone,
      address: local.contact.address,
      bio: local.contact.bio,
      avatar: local.contact.avatar
    },
    social_media: local.social_media,
    avatar: local.avatar
  }

  try {
    const ok = await auth.updateUser(payload)
    if (ok) {
      // sync local copy with returned user
      const u = auth.user
      if (u) {
        local.firstName = u.firstName || ''
        local.lastName = u.lastName || ''
        local.email = u.email || ''
        local.role = u.role || 'user'
  local.projects = normalizeProjects(u.projects)
        local.contact.company = u.contact?.company || ''
        local.contact.phone = u.contact?.phone || ''
        local.contact.address = u.contact?.address || { street: '', city: '', state: '', zip: '', country: '', taxId: '' }
        local.contact.bio = u.contact?.bio || ''
        local.contact.avatar = u.contact?.avatar || ''
        local.social_media = u.social_media || { linkedin: '' }
  local.avatar = u.avatar || u.contact?.avatar || ''
      }
      // Sync selected project id to projectStore/localStorage if a default project exists
      try {
        if (u && Array.isArray(u.projects)) {
          const dp = u.projects.find(p => p && p.default)
          if (dp) {
            const id = typeof dp === 'string' ? dp : (dp._id || dp.id || null)
            if (id) projectStore.setCurrentProject(id)
          }
        }
  } catch (e) { /* ignore */ }
      status.value = 'Saved'
  toast.message = 'Profile saved'
  toast.variant = 'white'
  toast.top = '50vh'
  toast.show = true
      setTimeout(() => (status.value = ''), 2000)
    } else {
      status.value = auth.error || 'Failed to save'
  toast.message = status.value
  toast.variant = 'white'
  toast.top = '50vh'
  toast.show = true
    }
  } catch (e) {
    status.value = auth.error || 'Failed to save'
  toast.message = status.value
  toast.variant = 'white'
  toast.top = '50vh'
  toast.show = true
  } finally {
    saving.value = false
  }
}

function reset() {
  local.firstName = auth.user?.firstName || ''
  local.lastName = auth.user?.lastName || ''
  local.email = auth.user?.email || ''
  local.role = auth.user?.role || 'user'
  local.contact.company = auth.user?.contact?.company || ''
  local.projects = normalizeProjects(auth.user?.projects)
  local.contact.phone = auth.user?.contact?.phone || ''
  local.contact.address = auth.user?.contact?.address || { street: '', city: '', state: '', zip: '', country: '', taxId: '' }
  local.contact.bio = auth.user?.contact?.bio || ''
  local.contact.avatar = auth.user?.contact?.avatar || ''
  local.social_media.linkedin = auth.user?.social_media?.linkedin || ''
  local.avatar = auth.user?.avatarUrl || auth.user?.contact?.avatar || ''
}

function onFileChange(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    preview.value = ev.target.result
  }
  reader.readAsDataURL(f)
}

function startCrop() {
  if (!preview.value) return
  isCropping.value = true
  // reset crop center
  crop.sizePx = Math.min(160, 320)
  crop.x = 80
  crop.y = 80
}

function startDrag(e) {
  dragging.value = true
  dragStart.x = e.clientX
  dragStart.y = e.clientY
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', endDrag)
}

function onDrag(e) {
  if (!dragging.value) return
  const dx = e.clientX - dragStart.x
  const dy = e.clientY - dragStart.y
  dragStart.x = e.clientX
  dragStart.y = e.clientY
  crop.x = Math.max(0, Math.min(320 - crop.sizePx, crop.x + dx))
  crop.y = Math.max(0, Math.min(320 - crop.sizePx, crop.y + dy))
}

function endDrag() {
  dragging.value = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', endDrag)
}

const cropRectStyle = computed(() => ({ left: crop.x + 'px', top: crop.y + 'px', width: crop.sizePx + 'px', height: crop.sizePx + 'px' }))

async function applyCrop() {
  if (!preview.value) return
  // draw cropped area to canvas
  const img = new Image()
  img.src = preview.value
  await new Promise(r => (img.onload = r))
  const scaleX = img.naturalWidth / 320
  const scaleY = img.naturalHeight / 320
  const sx = Math.round(crop.x * scaleX)
  const sy = Math.round(crop.y * scaleY)
  const sSize = Math.round(crop.sizePx * ((scaleX + scaleY) / 2))

  const canvas = document.createElement('canvas')
  canvas.width = sSize
  canvas.height = sSize
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, sSize, sSize)

  // compress/resize to reduce size under ~250KB (recommended for avatars); cap to 512px and start quality 0.92
  const maxDim = 512
  let targetW = canvas.width
  let targetH = canvas.height
  if (targetW > maxDim || targetH > maxDim) {
    const ratio = Math.min(maxDim / targetW, maxDim / targetH)
    targetW = Math.round(targetW * ratio)
    targetH = Math.round(targetH * ratio)
  }
  const outCanvas = document.createElement('canvas')
  outCanvas.width = targetW
  outCanvas.height = targetH
  const outCtx = outCanvas.getContext('2d')
  outCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, targetW, targetH)

  // attempt quality from 0.92 downward until under size threshold (250 KB) or quality floor
  let quality = 0.92
  let dataUrl = outCanvas.toDataURL('image/jpeg', quality)
  const maxBytes = 250 * 1024 // 250 KB
  // dataUrl length is a string size in characters; approximate bytes by length * 0.75 when base64
  function approxBytesFromDataUrl(d) {
    // strip header
    const base64 = d.split(',')[1] || ''
    return Math.ceil((base64.length * 3) / 4)
  }
  while (approxBytesFromDataUrl(dataUrl) > maxBytes && quality > 0.5) {
    quality -= 0.08
    dataUrl = outCanvas.toDataURL('image/jpeg', quality)
  }

  // set preview to the processed data url
  preview.value = dataUrl
  isCropping.value = false
}

function cancelCrop() {
  isCropping.value = false
}

// Change password state
const pwd = reactive({ current: '', new: '', confirm: '' })
const pwdErrors = reactive({ current: '', new: '', confirm: '' })
const pwdSaving = ref(false)
const pwdStatus = ref('')

function validatePwd() {
  pwdErrors.current = pwd.current ? '' : 'Current password required'
  pwdErrors.new = (pwd.new && pwd.new.length >= 8) ? '' : 'New password must be at least 8 characters'
  pwdErrors.confirm = pwd.confirm === pwd.new ? '' : 'Passwords do not match'
  return !pwdErrors.current && !pwdErrors.new && !pwdErrors.confirm
}

async function changePasswordHandler() {
  pwdStatus.value = ''
  if (!validatePwd()) return
  pwdSaving.value = true
  try {
    const res = await auth.changePassword(pwd.current, pwd.new)
    if (res.success) {
      pwdStatus.value = 'Password updated'
      pwd.current = ''
      pwd.new = ''
      pwd.confirm = ''
      toast.message = 'Password updated'
      toast.show = true
      setTimeout(() => (pwdStatus.value = ''), 2000)
    } else {
      pwdStatus.value = res.error || 'Failed to change password'
      toast.message = pwdStatus.value
      toast.show = true
    }
  } catch (e) {
    pwdStatus.value = auth.error || 'Failed to change password'
    toast.message = pwdStatus.value
    toast.show = true
  } finally {
    pwdSaving.value = false
  }
}

async function uploadAvatar() {
  if (!preview.value) return
  avatarStatus.value = 'Uploading...'
  try {
    const ok = await auth.updateUser({ avatar: preview.value, userId: auth.user?._id || auth.user?.id })
    if (ok) {
      local.avatar = auth.user?.avatar || auth.user?.contact?.avatar || preview.value
      preview.value = ''
      avatarStatus.value = 'Uploaded'
      toast.message = 'Avatar updated'
      toast.show = true
    } else {
      avatarStatus.value = auth.error || 'Upload failed'
      toast.message = avatarStatus.value
      toast.show = true
    }
  } catch (e) {
    avatarStatus.value = auth.error || 'Upload failed'
    toast.message = avatarStatus.value
    toast.show = true
  } finally {
    setTimeout(() => (avatarStatus.value = ''), 2000)
  }
}

async function removeAvatar() {
  avatarStatus.value = 'Removing...'
  try {
    const ok = await auth.updateUser({ avatar: '' })
    if (ok) {
      local.avatar = auth.user?.avatar || auth.user?.contact?.avatar || ''
      preview.value = ''
      avatarStatus.value = 'Removed'
      toast.message = 'Avatar removed'
      toast.show = true
    } else {
      avatarStatus.value = auth.error || 'Remove failed'
      toast.message = avatarStatus.value
      toast.show = true
    }
  } catch (e) {
    avatarStatus.value = auth.error || 'Remove failed'
    toast.message = avatarStatus.value
    toast.show = true
  } finally {
    setTimeout(() => (avatarStatus.value = ''), 2000)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function selectProject(proj) {
  // prefer _id then id
  const id = proj._id || proj.id
  if (id) {
    projectStore.setCurrentProject(id)
    // navigate to projects overview
    router.push({ path: '/projects' })
  }
}

function editProject(proj) {
  // navigate to projects page with edit query or open modal depending on app patterns
  const id = proj._id || proj.id
  if (id) {
    router.push({ path: `/projects/${id}/edit` })
  } else {
    // fallback: open general projects page
    router.push({ path: '/projects' })
  }
}

function canLeaveProject(proj) {
  try {
    if (!auth.user) return false
  // simple heuristic: if user's projects contains this project id, they can leave
    const pid = proj._id || proj.id
    if (!pid) return false
    return Array.isArray(auth.user.projects) && auth.user.projects.some(p => String((p && (p._id || p.id || p))) === String(pid))
  } catch (e) { return false }
}

async function leaveProject(proj) {
  try {
    const pid = proj._id || proj.id
    if (!pid) return ui.showError('Project id missing')

    const confirmed = await inlineConfirm({ title: 'Leave project', message: `Are you sure you want to leave '${proj.name || 'this project'}'? You will lose access to its data.`, confirmText: 'Leave', cancelText: 'Cancel', variant: 'danger' })
    if (!confirmed) return

    // Attempt to remove the user from the project's team (server-side update)
    try {
      // fetch latest project then remove team member by email or user id
      const full = await projectStore.fetchProject(pid)
      if (full) {
        const userEmail = auth.user?.email
        full.team = (full.team || []).filter(t => {
          const identifier = (t && (t._id || t.email || t.id))
          return !(String(identifier) === String(auth.user._id) || String(t.email) === String(userEmail))
        })
        await projectStore.updateProject({ ...full })
      }
    } catch (e) {
      // ignore if project update fails; proceed to remove from user so their view is updated
      console.error('leaveProject: failed to remove from project team', e)
    }

    // Remove project reference from user and persist via auth.updateUser
    try {
      const updated = (auth.user.projects || []).filter(p => String((p && (p._id || p.id || p))) !== String(pid))
      const ok = await auth.updateUser({ projects: updated })
      if (ok) {
        // sync local view
        local.projects = normalizeProjects(auth.user?.projects)
        ui.showSuccess('You left the project')
      } else {
        ui.showError('Failed to remove project from your account')
      }
    } catch (e) {
      ui.showError('Failed to leave project')
    }
  } catch (e) {
    ui.showError('Failed to leave project')
  }
}

async function makeDefault(proj) {
  // update local copy: set selected project's default true, others false
  local.projects = local.projects.map(p => ({ ...p, default: (p._id || p.id) === (proj._id || proj.id) }))

  // prepare payload for auth.updateUser - keep other user fields unchanged
  const payload = {
    projects: local.projects
  }

  try {
    saving.value = true
    const ok = await auth.updateUser(payload)
    if (ok) {
      // sync auth.user.projects back into local normalized form
      local.projects = normalizeProjects(auth.user?.projects)
      // set current project in store to newly defaulted project
      const id = proj._id || proj.id
      if (id) projectStore.setCurrentProject(id)

      status.value = 'Default project updated'
      toast.message = 'Default project updated'
      toast.variant = 'white'
      toast.top = '50vh'
      toast.show = true
      setTimeout(() => (status.value = ''), 2000)
    } else {
      status.value = auth.error || 'Failed to update default'
      toast.message = status.value
      toast.variant = 'white'
      toast.top = '50vh'
      toast.show = true
    }
  } catch (e) {
    status.value = auth.error || 'Failed to update default'
    toast.message = status.value
    toast.variant = 'white'
    toast.top = '50vh'
    toast.show = true
  } finally {
    saving.value = false
  }
}

</script>
