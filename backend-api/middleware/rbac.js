const Role = require('../models/role');

// requirePermission(permission, opts)
// opts: { projectParam: 'projectId' } - look up project-scoped role from request params/body/query
const requirePermission = (permission, opts = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).send({ error: 'Please authenticate.' });

      // global-admin short-circuit: full access to everything managed by RBAC
      const userGlobalRole = String(req.user.role || '').trim();
      if (userGlobalRole === 'globaladmin') return next();

      // Helper to check permissions on a specific role document
      const checkRoleDoc = (roleDoc) => {
        if (!roleDoc) return false;
        const perms = Array.isArray(roleDoc.permissions) ? roleDoc.permissions : [];
        return perms.includes(permission);
      };

      // If projectParam is provided, attempt to resolve a project-scoped role first
      if (opts && opts.projectParam) {
        const projectId = req.params[opts.projectParam] || req.body && req.body[opts.projectParam] || req.query && req.query[opts.projectParam];
        if (projectId) {
          // lazy-load Project model to avoid circular deps
          const Project = require('../models/project');
          const project = await Project.findById(projectId).lean();
          if (project && Array.isArray(project.team)) {
            // find user's role entry in project team
            const userId = String(req.user._id || req.user.id || req.user._id);
            const member = project.team.find((t) => String(t._id || t.id || t._id) === userId || String((t.email || '')).toLowerCase() === String((req.user.email || '')).toLowerCase());
            if (member && member.role) {
              // project admin short-circuit: a team member with role 'admin' is a project admin
              if (String(member.role).trim() === 'admin') return next();
              // try to find a project-scoped Role with this name
              const roleDoc = await Role.findOne({ name: member.role, scope: 'project', projectId: project._id });
              if (checkRoleDoc(roleDoc)) return next();
            }
          }
        }
      }

      // Fall back to checking a global role document matching the user's global role
      const roleName = userGlobalRole || '';
      if (roleName) {
        // try to find a global role doc first
        const globalRoleDoc = await Role.findOne({ name: roleName, scope: 'global' });
        if (checkRoleDoc(globalRoleDoc)) return next();
      }

      // Lastly, check if there is a global role document matching the project-role name if provided
      return res.status(403).send({ error: 'Forbidden' });
    } catch (err) {
      console.error('[rbac] permission check error', err && err.message ? err.message : err);
      return res.status(500).send({ error: 'RBAC error' });
    }
  };
};

module.exports = { requirePermission };
