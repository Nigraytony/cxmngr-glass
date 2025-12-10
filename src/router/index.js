import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useProjectStore } from '../stores/project'
import { useUiStore } from '../stores/ui'
import http from '../utils/http'

const Login = () => import('../pages/auth/Login.vue')
const Register = () => import('../pages/auth/Register.vue')
const ForgotPassword = () => import('../pages/auth/ForgotPassword.vue')
const ResetPassword = () => import('../pages/auth/ResetPassword.vue')
const DashboardLayout = () => import('../layouts/DashboardLayout.vue')
const DashboardHome = () => import('../pages/dashboard/DashboardHome.vue')
const IssueEdit = () => import('../pages/issues/IssueEdit.vue')
const Profile = () => import('../pages/profile/Profile.vue')
const ProjectEdit = () => import('../pages/projects/ProjectEdit.vue')
const WebhookEvents = () => import('../pages/admin/WebhookEvents.vue')
const AdminRoles = () => import('../pages/admin/Roles.vue')
const AdminDashboard = () => import('../pages/admin/AdminDashboard.vue')
const AdminUsers = () => import('../pages/admin/Users.vue')
const AdminProjects = () => import('../pages/admin/Projects.vue')
const AdminTemplates = () => import('../pages/admin/Templates.vue')
const AdminBilling = () => import('../pages/admin/Billing.vue')
const ActivityEdit = () => import('../pages/activities/ActivityEdit.vue')
const SpaceEdit = () => import('../pages/spaces/EditSpaces.vue')
const EquipmentEdit = () => import('../pages/equipment/EquipmentEdit.vue')
// Use the cleaned up editor component to avoid malformed legacy file
const TemplateEdit = () => import('../pages/templates/TemplateEditor.vue')

const routes = [
  { path: '/login', name: 'login', component: Login, meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: Register, meta: { guestOnly: true } },
  { path: '/forgot-password', name: 'forgot-password', component: ForgotPassword, meta: { guestOnly: true } },
  { path: '/reset-password', name: 'reset-password', component: ResetPassword, meta: { guestOnly: true } },
  {
    path: '/',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: DashboardHome },
      { path: 'issues', name: 'issues', component: () => import(/* webpackChunkName: "issues" */ '../pages/issues/IssuesList.vue') },
    { path: 'issues/:id', name: 'issue-edit', component: IssueEdit, props: true },
  { path: 'activities', name: 'activities', component: () => import(/* webpackChunkName: "activities" */ '../pages/activities/ActivitiesList.vue') },
  { path: 'activities/:id', name: 'activity-edit', component: ActivityEdit, props: true },
      { path: 'spaces', name: 'spaces', component: () => import(/* webpackChunkName: "spaces" */ '../pages/spaces/SpacesList.vue') },
      { path: 'equipment', name: 'equipment', component: () => import(/* webpackChunkName: "equipment" */ '../pages/equipment/EquipmentList.vue') },
  { path: 'spaces/:id', name: 'space-edit', component: SpaceEdit, props: true },
      { path: 'equipment/:id', name: 'equipment-edit', component: EquipmentEdit, props: true },
    { path: 'templates', name: 'templates', component: () => import(/* webpackChunkName: "templates" */ '../pages/templates/TemplatesList.vue') },
    { path: 'templates/:id', name: 'template-edit', component: TemplateEdit, props: true },
      { path: 'projects', name: 'projects', component: () => import('../pages/projects/ProjectsList.vue') },
      { path: 'tasks', name: 'tasks', component: () => import('../pages/tasks/TasksList.vue') },
      { path: 'tasks/:id', name: 'task-edit', component: () => import('../pages/tasks/TaskEdit.vue'), props: true },
      { path: 'projects/edit/:id?', name: 'project-settings', component: ProjectEdit },
      { path: 'admin/webhooks', name: 'admin-webhooks', component: WebhookEvents, meta: { adminOnly: true } },
  { path: 'admin/roles', name: 'admin-roles', component: AdminRoles, meta: { adminOnly: true } },
        { path: 'admin', name: 'admin', component: AdminDashboard, meta: { adminOnly: true } },
        { path: 'admin/users', name: 'admin-users', component: AdminUsers, meta: { adminOnly: true } },
        { path: 'admin/audit', name: 'admin-audit', component: () => import('../pages/admin/Audit.vue'), meta: { adminOnly: true } },
        { path: 'admin/users/:id', name: 'admin-users-edit', component: () => import('../pages/admin/UserEdit.vue'), meta: { adminOnly: true }, props: true },
        { path: 'admin/projects', name: 'admin-projects', component: AdminProjects, meta: { adminOnly: true } },
        { path: 'admin/projects/:id', name: 'admin-projects-edit', component: () => import('../pages/admin/ProjectEdit.vue'), meta: { adminOnly: true }, props: true },
        { path: 'admin/templates', name: 'admin-templates', component: AdminTemplates, meta: { adminOnly: true } },
        { path: 'admin/templates/:id', name: 'admin-templates-edit', component: () => import('../pages/admin/TemplateEdit.vue'), meta: { adminOnly: true }, props: true },
        { path: 'admin/billing', name: 'admin-billing', component: AdminBilling, meta: { adminOnly: true } },
      { path: 'profile', name: 'profile', component: Profile },
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Dynamic plan feature map fetched from backend /api/plans
let PLAN_FEATURES = null
let plansFetchInFlight = null
async function ensurePlansLoaded() {
  if (PLAN_FEATURES && Object.keys(PLAN_FEATURES).length > 0) return PLAN_FEATURES
  if (plansFetchInFlight) return plansFetchInFlight
  plansFetchInFlight = (async () => {
    try {
      const { data } = await http.get('/api/plans')
      const arr = Array.isArray(data) ? data : []
      const map = {}
      for (const p of arr) {
        const key = String(p.key || '').toLowerCase()
        const feats = p && p.features && typeof p.features === 'object' ? p.features : {}
        if (!key) continue
        map[key] = {}
        for (const [fk, fv] of Object.entries(feats)) {
          const normK = String(fk || '').toLowerCase()
          const on = fv === true || fv === 'true' || fv === 1
          map[key][normK] = on
        }
      }
      PLAN_FEATURES = map
      return PLAN_FEATURES
    } catch (e) {
      // Fallback to sensible defaults if fetch fails
      PLAN_FEATURES = {
        basic:    { issues: true, equipment: true, spaces: false, templates: false, activities: false, tasks: false },
        standard: { issues: true, equipment: true, spaces: true,  templates: true,  activities: true,  tasks: false },
        premium:  { issues: true, equipment: true, spaces: true,  templates: true,  activities: true,  tasks: true },
      }
      return PLAN_FEATURES
    } finally {
      plansFetchInFlight = null
    }
  })()
  return plansFetchInFlight
}

function normalizeFeatureFlags(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw)) {
    if (!k) continue
    const key = k.toLowerCase()
    if (v === false || v === 'false' || v === 0) { out[key] = false; continue }
    if (v === true || v === 'true' || v === 1) { out[key] = true; continue }
  }
  return out
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const projectStore = useProjectStore()
  const ui = useUiStore()
    // Ensure plans are loaded for gating decisions
    try { await ensurePlansLoaded() } catch (e) { /* ignore gating init errors */ }
  // wait briefly for auth bootstrap to complete so guards don't flash unauthenticated
  try { if (typeof auth.waitForAuthReady === 'function') await auth.waitForAuthReady(2500) } catch (e) { /* ignore auth bootstrap timeout */ }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
  if (to.meta.adminOnly) {
    const r = auth.user?.role
    const allowed = r === 'admin' || r === 'globaladmin' || r === 'superadmin'
    if (!allowed) return { name: 'dashboard' }
  }

  // Feature gating based on project subscription features
  const featureRouteMap = {
    spaces: ['spaces', 'space-edit'],
    equipment: ['equipment', 'equipment-edit'],
    templates: ['templates', 'template-edit'],
    activities: ['activities', 'activity-edit'],
    issues: ['issues', 'issue-edit'],
    tasks: ['tasks', 'task-edit'],
  }
  const routeName = to.name ? String(to.name) : ''
  let featureKey = null
  for (const [k, names] of Object.entries(featureRouteMap)) {
    if (names.includes(routeName)) { featureKey = k; break }
  }
  if (featureKey) {
    const userFlags = normalizeFeatureFlags(projectStore.currentProject?.subscriptionFeatures)
    const tier = (projectStore.currentProject?.subscriptionTier || projectStore.currentProject?.subscription || '').toLowerCase()
    const tierFlags = (tier && PLAN_FEATURES && PLAN_FEATURES[tier]) ? PLAN_FEATURES[tier] : {}
    // Merge: tier defaults first, then project-specific overrides
    const flags = { ...tierFlags, ...userFlags }
    if (flags && flags[featureKey] === false) {
      const featureName = featureKey.charAt(0).toUpperCase() + featureKey.slice(1)
      ui.showWarning(`${featureName} is not available on your current plan. Upgrade to access it.`, { duration: 4000 })
      return { name: 'project-settings', query: { tab: 'subscription', upgrade: featureKey } }
    }
  }
})

export default router
