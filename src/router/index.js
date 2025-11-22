import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

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
      { path: 'profile', name: 'profile', component: Profile },
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
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
})

export default router