// Issue Detail report orchestration: fetches everything the report needs
// (full issue incl. base64 photos, Azure photos, logs, the linked activity's
// name, the project), assembles the shared view-model and renders/delivers
// the PDF. IssueEdit and the issues list both come through here.
import axios from 'axios'
import http from '../../../utils/http'
import { deliverBlob, deliverPdfBytes, reportFileName } from '../../core/deliver'
import { loadImage } from '../../core/images'
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

// The docs folder tree is fetched once per project and reused for ~30s so a
// batch export of N issues doesn't refetch it N times.
const treeCache = new Map<string, { ts: number; flat: Array<{ id: string; name: string; parentId: string | null }> }>()
async function docsTreeFlat(projectId: string): Promise<Array<{ id: string; name: string; parentId: string | null }>> {
  const hit = treeCache.get(projectId)
  if (hit && Date.now() - hit.ts < 30_000) return hit.flat
  const tree = (await http.get(`/api/projects/${projectId}/docs/folders/tree`)).data
  const flat: Array<{ id: string; name: string; parentId: string | null }> = []
  const walk = (node: any) => {
    for (const ch of (Array.isArray(node?.children) ? node.children : [])) {
      if (ch && ch.id) flat.push({ id: String(ch.id), name: String(ch.name || ''), parentId: ch.parentId ? String(ch.parentId) : null })
      walk(ch)
    }
  }
  walk(tree?.root)
  treeCache.set(projectId, { ts: Date.now(), flat })
  return flat
}

/** The issue's Azure photo FILES (Photos/Issue/<id>), metadata only. */
export async function listAzureIssuePhotoFiles(projectId: string, issueId: string): Promise<Array<{ id: string; name: string }>> {
  if (!projectId || !issueId) return []
  try {
    const flat = await docsTreeFlat(projectId)
    let parentId: string | null = null
    for (const seg of ['Photos', 'Issue', issueId]) {
      const f = flat.find((x) => (x.parentId || null) === (parentId || null) && x.name.trim() === seg)
      if (!f) return []
      parentId = f.id
    }
    const filesRes = (await http.get(`/api/projects/${projectId}/docs/files`, { params: { folderId: parentId } })).data
    return (Array.isArray(filesRes?.files) ? filesRes.files : [])
      .filter((f: any) => f && f.status !== 'deleted' && String(f.contentType || '').toLowerCase().startsWith('image/'))
      .map((f: any) => ({ id: String(f.id), name: String(f.name || '') }))
  } catch (e) {
    return []
  }
}

/** One Azure doc file as a data URL ('' on failure). */
export async function downloadDocFileDataUrl(projectId: string, fileId: string): Promise<string> {
  try {
    const { downloadUrl } = (await http.get(`/api/projects/${projectId}/docs/files/${fileId}/download-url`)).data
    const blob = (await axios.get(downloadUrl, { responseType: 'blob', withCredentials: false })).data
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(reader.error || new Error('read failed'))
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    return ''
  }
}

/** Azure docs photos for the issue (Photos/Issue/<id>), as data URLs. */
async function fetchAzureIssuePhotos(projectId: string, issueId: string, limit = 12): Promise<Array<{ dataUrl: string; fileId: string }>> {
  const files = await listAzureIssuePhotoFiles(projectId, issueId)
  const out: Array<{ dataUrl: string; fileId: string }> = []
  for (const f of files.slice(0, limit)) {
    const dataUrl = await downloadDocFileDataUrl(projectId, f.id)
    if (dataUrl) out.push({ dataUrl, fileId: f.id })
  }
  return out
}

/** OPR items linked to the issue (best effort — the OPR module is an add-on). */
async function fetchOprItems(projectId: string, ids: string[]): Promise<Array<{ ref: string; text: string; category: string }>> {
  if (!projectId || !ids.length) return []
  try {
    const res = await http.get(`/api/projects/${projectId}/opr/items`, { params: { ids: ids.join(','), includeArchived: true } })
    const items: any[] = Array.isArray(res.data?.items) ? res.data.items : (Array.isArray(res.data) ? res.data : [])
    const cats: Record<string, string> = {}
    try {
      const cres = await http.get(`/api/projects/${projectId}/opr/categories`)
      const list: any[] = Array.isArray(cres.data?.categories) ? cres.data.categories : (Array.isArray(cres.data) ? cres.data : [])
      for (const cat of list) cats[String(cat._id || cat.id || '')] = String(cat.name || cat.title || '')
    } catch (e) { /* category names are decoration */ }
    return items.map((it: any) => ({
      ref: it?.rank != null ? `#${it.rank}` : '',
      text: String(it?.text || ''),
      category: cats[String(it?.categoryId || '')] || '',
    }))
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

  // Equipment tags: linked equipmentIds (Step 2) win; the tag field is the
  // fallback for issues that predate equipment linking.
  let equipmentTags: string[] = []
  const eqIds = (Array.isArray(issue?.equipmentIds) ? issue.equipmentIds : [])
    .map((v: any) => String((v && (v._id || v.id)) || v || ''))
    .filter(Boolean)
  for (const eid of eqIds.slice(0, 10)) {
    try {
      const res = await http.get(`/api/equipment/${eid}`)
      const t = res.data?.tag || res.data?.title
      if (t) equipmentTags.push(String(t))
    } catch (e) { /* skip */ }
  }
  if (!equipmentTags.length && issue?.tag) equipmentTags = [String(issue.tag)]

  const oprIds = (Array.isArray(issue?.oprItemIds) ? issue.oprItemIds : [])
    .map((v: any) => String((v && (v._id || v.id)) || v || '')).filter(Boolean)
  const oprItems = await fetchOprItems(projectId, oprIds)

  return assembleIssueReportModel({ issue, project, activityName, equipmentTags, logs, photos, oprItems })
}

export interface IssueReportOptions {
  /** Section toggles (all on when omitted); keys match the pdf renderer. */
  sections?: Record<string, boolean>
  /** Batch cover's analytic summary band (shared with the Issues Log); on by default. */
  summaryBand?: boolean
}

/** Generate + deliver the redesigned Issue Detail PDF. */
export async function generateIssueDetailReport(issueLike: any, project: any, opts: IssueReportOptions = {}): Promise<void> {
  const model = await assembleIssueModelFor(issueLike, project)
  const bytes = await generateIssueDetailPdf(model, { project, sections: opts.sections })
  deliverPdfBytes(bytes, reportFileName([`issue-${model.number}`, model.title]))
}

/** Generate + deliver the Issue Detail report as an editable Word document.
 *  Same model and section toggles as the PDF, so the two cannot drift. */
export async function generateIssueDetailDocx(issueLike: any, project: any, opts: IssueReportOptions = {}): Promise<void> {
  const model = await assembleIssueModelFor(issueLike, project)
  const { generateIssueReportDocx } = await import('./docx')
  const client = await loadImage(project?.logo)
  const cxa = await loadImage(project?.commissioning_agent?.logo)
  const blob = await generateIssueReportDocx(model, {
    project,
    sections: opts.sections,
    logos: { client: client?.dataUrl, cxa: cxa?.dataUrl },
  })
  deliverBlob(blob, reportFileName([`issue-${model.number}`, model.title], 'docx'))
}

/** The Issues list's per-project section preferences (set in IssueEdit's ▾ menu). */
export function loadIssueReportSections(projectId: string): Record<string, boolean> | undefined {
  try {
    const raw = localStorage.getItem(`issueReportSections:${projectId || 'global'}`)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? parsed : undefined
  } catch (e) {
    return undefined
  }
}

/**
 * Batch export (Step 5): one PDF with a cover table and each selected issue
 * as its own full sheet. Gathers every issue's photos/logs/links, so large
 * selections take a while — the caller shows progress.
 */
export async function generateIssuesBatchReport(issuesLike: any[], project: any, opts: IssueReportOptions = {}): Promise<void> {
  const models = []
  for (const il of issuesLike) {
    try {
      models.push(await assembleIssueModelFor(il, project))
    } catch (e) { /* skip an unloadable issue rather than failing the batch */ }
  }
  if (!models.length) return
  const { generateIssuesBatchPdf } = await import('./pdf')
  const bytes = await generateIssuesBatchPdf(models, { project, sections: opts.sections, summaryBand: opts.summaryBand, bandIssues: issuesLike })
  deliverPdfBytes(bytes, reportFileName([String(project?.name || ''), 'issues-report']))
}
