// Client for project-shared saved report definitions
// (/api/projects/:projectId/report-definitions). Stage 1 payloads are list
// presets: { columns: string[], sort?, filters?, ... }.
import http from '../../utils/http'

export interface ReportDefinitionRecord {
  _id: string
  projectId: string
  entity: string
  name: string
  description?: string
  definition: Record<string, any>
  createdByName?: string
  createdAt?: string
  updatedAt?: string
}

const base = (projectId: string) => `/api/projects/${projectId}/report-definitions`

export async function listReportDefinitions(projectId: string, entity?: string): Promise<ReportDefinitionRecord[]> {
  const { data } = await http.get(base(projectId), { params: entity ? { entity } : {} })
  return Array.isArray(data?.items) ? data.items : []
}

export async function createReportDefinition(projectId: string, payload: { entity: string; name: string; description?: string; definition: Record<string, any> }): Promise<ReportDefinitionRecord> {
  const { data } = await http.post(base(projectId), payload)
  return data
}

export async function updateReportDefinition(projectId: string, id: string, payload: Partial<{ name: string; description: string; definition: Record<string, any> }>): Promise<ReportDefinitionRecord> {
  const { data } = await http.patch(`${base(projectId)}/${id}`, payload)
  return data
}

export async function deleteReportDefinition(projectId: string, id: string): Promise<void> {
  await http.delete(`${base(projectId)}/${id}`)
}
