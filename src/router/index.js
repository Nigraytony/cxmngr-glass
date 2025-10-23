import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const Login = () => import('../pages/auth/Login.vue')
const Register = () => import('../pages/auth/Register.vue')
const DashboardLayout = () => import('../layouts/DashboardLayout.vue')
const DashboardHome = () => import('../pages/dashboard/DashboardHome.vue')
const IssuesList = () => import('../pages/issues/IssuesList.vue')
const Profile = () => import('../pages/profile/Profile.vue')
const ProjectEdit = () => import('../pages/projects/ProjectEdit.vue')
const WebhookEvents = () => import('../pages/admin/WebhookEvents.vue')
const ActivitiesList = () => import('../pages/activities/ActivitiesList.vue')
const ActivityEdit = () => import('../pages/activities/ActivityEdit.vue')

const routes = [
  { path: '/login', name: 'login', component: Login, meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: Register, meta: { guestOnly: true } },
  {
    path: '/',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: DashboardHome },
      { path: 'issues', name: 'issues', component: IssuesList },
  { path: 'activities', name: 'activities', component: ActivitiesList },
  { path: 'activities/:id', name: 'activity-edit', component: ActivityEdit, props: true },
      { path: 'projects', name: 'projects', component: () => import('../pages/projects/ProjectsList.vue') },
      { path: 'projects/edit/:id?', name: 'project-settings', component: ProjectEdit },
      { path: 'admin/webhooks', name: 'admin-webhooks', component: WebhookEvents, meta: { adminOnly: true } },
      { path: 'profile', name: 'profile', component: Profile },
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
  if (to.meta.adminOnly && auth.user?.role !== 'admin') {
    return { name: 'dashboard' }
  }
})

export default router
