// Display labels for issue fields, never raw names (createdAt,
// responsible_person…). Dependency-free on purpose: the Data exports
// (xlsx-heavy) and the list PDF both import it without dragging each
// other's chunks along.
export const ISSUE_HEADER_LABELS: Record<string, string> = {
  number: '#',
  title: 'Title',
  description: 'Description',
  type: 'Type',
  priority: 'Priority',
  severity: 'Priority',
  status: 'Status',
  responsible_person: 'Responsible',
  assignedto: 'Responsible',
  foundby: 'Found by',
  datefound: 'Date found',
  duedate: 'Due date',
  closeddate: 'Closed date',
  closedby: 'Closed by',
  createdat: 'Created',
  updatedat: 'Updated',
  location: 'Location',
  system: 'System',
  tag: 'Equipment',
  recommendation: 'Recommendation',
  resolution: 'Resolution',
  labels: 'Tags',
}

export function issueColumnLabel(key: string): string {
  const hit = ISSUE_HEADER_LABELS[String(key).toLowerCase()]
  if (hit) return hit
  return String(key).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\w/, ch => ch.toUpperCase())
}
