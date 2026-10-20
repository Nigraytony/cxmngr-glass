// Project-team membership helpers (extracted from routes/finalReports.js so
// other project-scoped routers can share them; finalReports keeps its local
// copies until its next touch).

function asString(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function isGlobalAdmin(user) {
  const role = asString(user && user.role).trim().toLowerCase();
  return role === 'globaladmin' || role === 'superadmin';
}

function userMatchesTeamMember(member, user) {
  const userId = asString(user && (user._id || user.id)).trim();
  const userEmail = asString(user && user.email).trim().toLowerCase();
  const memberId = asString(member && (member._id || member.id)).trim();
  const memberEmail = asString(member && member.email).trim().toLowerCase();
  return (
    (userId && memberId && userId === memberId) ||
    (userEmail && memberEmail && userEmail === memberEmail)
  );
}

function isProjectMember(project, user) {
  if (!project || !user) return false;
  if (isGlobalAdmin(user)) return true;
  const team = Array.isArray(project.team) ? project.team : [];
  return team.some((m) => userMatchesTeamMember(m, user));
}

function isProjectAdmin(project, user) {
  if (!project || !user) return false;
  if (isGlobalAdmin(user)) return true;
  const team = Array.isArray(project.team) ? project.team : [];
  return team.some((m) => {
    if (!userMatchesTeamMember(m, user)) return false;
    const role = asString(m && m.role).trim().toLowerCase();
    return role === 'admin' || role === 'globaladmin';
  });
}

module.exports = { isGlobalAdmin, userMatchesTeamMember, isProjectMember, isProjectAdmin };
