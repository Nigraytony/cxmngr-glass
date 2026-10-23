// Issue Detail report orchestration: fetches everything the report needs
// (full issue incl. base64 photos, Azure photos, logs, the linked activity's
// name, the project), assembles the shared view-model and renders/delivers
// the PDF. IssueEdit and the issues list both come through here.
import axios from 'axios'
import http from '../../../utils/http'
import { deliverPdfBytes, reportFileName } from '../../core/deliver'
import { assembleIssueReportModel, type IssueReportModel } from './model'
import { generateIssueDetailPdf } from './pdf'

async function fetchFullIssue(issueId: string, fallback: any): Promise<any> {
  try {
    const res = await http.get(`/api/issues/${issueId}`)
    return res.data && typeof res.data === 'object' ? res.data : fallback
  } catch (e) {
    return fallback
  }
}

async function fetchLogs(issueId: string): Promise<any[]> {
  try {
    const res = await http.get(`/api/issues/${issueId}/logs`)
    return Array.isArray(res.data) ? res.data : []
  } catch (e) {
    return []
  }
}

async function fetchActivityName(activityId: string): Promise<string> {
  if (!activityId) return ''
  try {
    const res = await http.get(`/api/activities/${activityId}`, { params: { light: true } })
    return String(res.data?.name || '')
  } catch (e) {
    return ''
  }
}

/** Azure docs photos for the issue (Photos/Issue/<id>), as data URLs. */
async function fetchAzureIssuePhotos(projectId: string, issueId: string, limit = 12): Promise<Array<{ dataUrl: string; fileId: string }>> {
  if (!projectId || !issueId) return []
  try {
    const tree = (await http.get(`/api/projects/${projectId}/docs/folders/tree`)).data
    const flat: Array<{ id: string; name: string; parentId: string | null }> = []
    const walk = (node: any) => {
      for (const ch of (Array.isArray(node?.children) ? node.children : [])) {
        if (ch && ch.id) flat.push({ id: String(ch.id), name: String(ch.name || ''), parentId: ch.parentId ? String(ch.parentId) : null })
        walk(ch)
      }
    }
    walk(tree?.root)
    let parentId: string | null = null
    for (const seg of ['Photos', 'Issue', issueId]) {
      const f = flat.find((x) => (x.parentId || null) === (parentId || null) && x.name.trim() === seg)
      if (!f) return []
      parentId = f.id
    }
    const filesRes = (await http.get(`/api/projects/${projectId}/docs/files`, { params: { folderId: parentId } })).data
    const files = (Array.isArray(filesRes?.files) ? filesRes.files : [])
      .filter((f: any) => f && f.status !== 'deleted' && String(f.contentType || '').toLowerCase().startsWith('image/'))
    const out: Array<{ dataUrl: string; fileId: string }> = []
    for (const f of files.slice(0, limit)) {
      try {
        const { downloadUrl } = (await http.get(`/api/projects/${projectId}/docs/files/${f.id}/download-url`)).data
        const blob = (await axios.get(downloadUrl, { responseType: 'blob', withCredentials: false })).data
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = () => reject(reader.error || new Error('read failed'))
          reader.readAsDataURL(blob)
        })
        if (dataUrl) out.push({ dataUrl, fileId: String(f.id) })
      } catch (e) { /* skip this photo */ }
    }
    return out
  } catch (e) {
    return []
  }
}

export async function assembleIssueModelFor(issueLike: any, project: any): Promise<IssueReportModel> {
  const issueId = String(issueLike?.id || issueLike?._id || '')
  const projectId = String(issueLike?.projectId || project?._id || project?.id || '')
  const [issue, logs] = await Promise.all([
    issueId ? fetchFullIssue(issueId, issueLike) : Promise.resolve(issueLike),
    issueId ? fetchLogs(issueId) : Promise.resolve([]),
  ])
  const activityName = await fetchActivityName(String(issue?.activityId || ''))

  // Photos: Azure docs folder first (captions via issue.photoMeta when the
  // Step 2/3 editing lands), then legacy base64 subdocs with their captions.
  const metaBag: any = (issue?.photoMeta && typeof issue.photoMeta === 'object') ? issue.photoMeta : {}
  const photos: Array<{ dataUrl: string; caption?: string }> = []
  for (const p of await fetchAzureIssuePhotos(projectId, issueId)) {
    photos.push({ dataUrl: p.dataUrl, caption: String(metaBag[p.fileId]?.caption || '') })
  }
  for (const p of (Array.isArray(issue?.photos) ? issue.photos : [])) {
    const src = p?.data || p?.url
    if (src) photos.push({ dataUrl: String(src), caption: String(p?.caption || '') })
  }

  // Equipment tags: Step 2 equipmentIds resolve here later; the tag field now.
  const equipmentTags = (Array.isArray(issue?.equipmentTags) && issue.equipmentTags.length)
    ? issue.equipmentTags.map((t: any) => String(t))
    : (issue?.tag ? [String(issue.tag)] : [])

  return assembleIssueReportModel({ issue, project, activityName, equipmentTags, logs, photos })
}

/** Generate + deliver the redesigned Issue Detail PDF. */
export async function generateIssueDetailReport(issueLike: any, project: any): Promise<void> {
  const model = await assembleIssueModelFor(issueLike, project)
  const bytes = await generateIssueDetailPdf(model, { project })
  deliverPdfBytes(bytes, reportFileName([`issue-${model.number}`, model.title]))
}
