const standardTeamRoles = require('../config/standardTeamRoles')

function buildAllProjectPermissions() {
  const out = []
  const addCrud = (resource) => {
    for (const op of ['create', 'read', 'update', 'delete']) out.push(`${resource}.${op}`)
  }

  addCrud('issues')
  addCrud('tasks')
  addCrud('activities')
  addCrud('equipment')
  addCrud('equipment.checklists')
  addCrud('equipment.functionalTests')
  addCrud('templates')
  addCrud('spaces')

  // Project meta permissions used by backend routes
  out.push('projects.update')
  out.push('projects.delete')
  out.push('projects.users.manage')
  out.push('projects.roles.manage')

  return Array.from(new Set(out))
}

function buildReadOnlyProjectPermissions() {
  const out = []
  const addRead = (resource) => out.push(`${resource}.read`)

  addRead('issues')
  addRead('tasks')
  addRead('activities')
  addRead('equipment')
  addRead('equipment.checklists')
  addRead('equipment.functionalTests')
  addRead('templates')
  addRead('spaces')

  // There is no permission gate for reading a project; membership is used.
  return Array.from(new Set(out))
}

function defaultPermissionsForRole(roleName) {
  const r = String(roleName || '').trim().toLowerCase()
  if (r === 'admin' || r === 'cxa') return buildAllProjectPermissions()
  // Default everyone else to read-only; project admins can edit these.
  return buildReadOnlyProjectPermissions()
}

function buildDefaultProjectRoleTemplates(opts = {}) {
  const now = new Date()
  const standard = Array.isArray(opts.standardRoles) ? opts.standardRoles : standardTeamRoles

  // Always include 'admin' even though it is not in standardTeamRoles.
  const names = ['admin', ...standard]

  return names.map((name) => ({
    name,
    description: '',
    permissions: defaultPermissionsForRole(name),
    createdAt: now,
    updatedAt: now,
  }))
}

function ensureDefaultProjectRoleTemplates(project, opts = {}) {
  if (!project) return { added: 0, roleTemplates: [] }
  const standard = Array.isArray(opts.standardRoles) ? opts.standardRoles : standardTeamRoles
  const desiredNames = ['admin', ...standard]

  project.roleTemplates = Array.isArray(project.roleTemplates) ? project.roleTemplates : []
  const existingLower = new Set(project.roleTemplates.map((t) => String(t && t.name || '').trim().toLowerCase()).filter(Boolean))

  let added = 0
  const now = new Date()
  for (const name of desiredNames) {
    const key = String(name).trim().toLowerCase()
    if (!key || existingLower.has(key)) continue
    project.roleTemplates.push({
      name: String(name).trim(),
      description: '',
      permissions: defaultPermissionsForRole(name),
      createdAt: now,
      updatedAt: now,
    })
    existingLower.add(key)
    added++
  }

  return { added, roleTemplates: project.roleTemplates }
}

module.exports = {
  buildDefaultProjectRoleTemplates,
  ensureDefaultProjectRoleTemplates,
  defaultPermissionsForRole,
}
