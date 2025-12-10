<template>
  <div class="gantt-wrapper">
    <div
      class="gantt-inner"
      :style="{ minWidth: chartMinWidth + 'px' }"
    >
      <template>
        <div></div>
      </template>

// Build a hierarchical tree from WBS and emit depth-first rows.
function parseWbsSegments(wbs) {
  if (!wbs && wbs !== 0) return []
  return String(wbs).split('.').filter(s => s !== '')
}

const rows = computed(() => {
  const tasksList = (props.tasks || []).slice()
  const nodeMap = new Map()

  function ensureNode(key) {
    if (!nodeMap.has(key)) {
      nodeMap.set(key, { key, task: null, children: [] })
    }
    return nodeMap.get(key)
  }

  for (const t of tasksList) {
    const key = t && t.wbs ? String(t.wbs) : `__id__${String(t._id || t.id || Math.random().toString(36).slice(2,9))}`
    const n = ensureNode(key)
    n.task = t
  }

  for (const [key, node] of Array.from(nodeMap.entries())) {
    const segs = parseWbsSegments(node.key)
    if (segs.length === 0) continue
    for (let i = 1; i < segs.length; i++) {
      const parentKey = segs.slice(0, i).join('.')
      ensureNode(parentKey)
    }
  }

  for (const [key, node] of Array.from(nodeMap.entries())) {
    const segs = parseWbsSegments(key)
    if (segs.length === 0) continue
    const parentKey = segs.slice(0, -1).join('.')
    if (parentKey) {
      const p = ensureNode(parentKey)
      p.children.push(node)
    }
  }

  function nodeMapHasParent(k, map) {
    const segs = parseWbsSegments(k)
    if (segs.length <= 1) return false
    const parentKey = segs.slice(0, -1).join('.')
    return map.has(parentKey)
  }

  const roots = []
  for (const [key, node] of Array.from(nodeMap.entries())) {
    const segs = parseWbsSegments(key)
    if (segs.length === 0) {
      if (!nodeMapHasParent(key, nodeMap)) roots.push(node)
    } else if (segs.length === 1) {
      if (!nodeMapHasParent(key, nodeMap)) roots.push(node)
    }
  }

  if (roots.length === 0) {
    const sorted = tasksList.slice().sort((a, b) => {
      const A = a && a.wbs ? String(a.wbs) : ''
      const B = b && b.wbs ? String(b.wbs) : ''
      if (A === B) return String((a && (a.name || a.title)) || '').localeCompare(String((b && (b.name || b.title)) || ''))
      if (!A) return 1
      if (!B) return -1
      return A.localeCompare(B, undefined, { numeric: true })
    })
    return sorted.map(t => {
      const id = String(t._id || t.id || Math.random().toString(36).slice(2,9))
      const sDate = parseChartDate(t.start || t._start) || parseChartDate(t.end || t._end) || new Date()
      const eDate = parseChartDate(t.end || t._end) || new Date(sDate.getTime() + 1000 * 60 * 60 * 24)
      const s = fmtGanttDate(sDate)
      const e = fmtGanttDate(eDate)
      return { id, label: String(t.name || t.title || t.wbs || 'Untitled'), bars: [{ start: s, end: e, progress: typeof t.percentComplete === 'number' ? t.percentComplete : 0, ganttBarConfig: { id, label: String(t.name || t.title || 'Untitled') } }] }
    })
  }

  const out = []
  function traverse(node, depth = 0) {
    const labelBase = node.task ? (node.task.name || node.task.title || node.key) : node.key
    const indent = ' '.repeat(Math.max(0, depth * 2))
    const label = indent + String(labelBase || '')
    if (node.task) {
        const t = node.task
        const id = String(t._id || t.id || Math.random().toString(36).slice(2,9))
        // normalize start/end using Date parsing; if missing, fallback sensibly
        const sDate = parseChartDate(t.start || t._start) || parseChartDate(t.end || t._end) || new Date()
        const eDate = parseChartDate(t.end || t._end) || new Date(sDate.getTime() + 1000 * 60 * 60 * 24)
        const s = fmtGanttDate(sDate)
        const e = fmtGanttDate(eDate)
        out.push({ id, label, bars: [{ start: s, end: e, progress: typeof t.percentComplete === 'number' ? t.percentComplete : 0, ganttBarConfig: { id, label } }] })
    } else {
      out.push({ id: `group-${node.key}`, label, bars: [] })
    }
    node.children.sort((a, b) => String(a.key).localeCompare(String(b.key), undefined, { numeric: true }))
    for (const c of node.children) traverse(c, depth + 1)
  }

  roots.sort((a, b) => String(a.key).localeCompare(String(b.key), undefined, { numeric: true }))
  for (const r of roots) traverse(r, 0)
  return out
})

const chartStart = computed(() => {
  // Helper: determine if a task is a leaf given a WBS list
  function isLeafTaskWithList(wbsList, t) {
    if (!t) return false
    if (!t.wbs) return true
    const key = String(t.wbs)
    return !wbsList.some(w => w && w !== key && w.startsWith(key + '.'))
  }
  // Prefer computing bounds from leaf tasks (tasks without children) to avoid huge parent bars
  const tasks = props.tasks || []
  if (tasks.length) {
    const wbsList = tasks.map(t => (t && t.wbs) ? String(t.wbs) : null)
    const leafDates = tasks.filter(t => isLeafTaskWithList(wbsList, t)).map(t => ({ s: parseChartDate(t.start || t._start), e: parseChartDate(t.end || t._end) })).filter(x => x.s || x.e)
    if (leafDates.length) {
      const starts = leafDates.map(x => x.s ? x.s.getTime() : Infinity).filter(Boolean)
      const minStart = new Date(Math.min(...starts))
      const padMs = 1000 * 60 * 60 * 24 * 3
      return fmtGanttDate(new Date(minStart.getTime() - padMs))
    }
  }

  // Fallback to previous bars-based percentile-trimmed approach
  const bars = (rows.value || []).flatMap(r => (r.bars || []).map(b => ({ start: b.start, end: b.end }))).filter(b => b.start && b.end)
  if (!bars.length) return null
  const parsed = bars.map(b => ({ s: parseChartDate(b.start), e: parseChartDate(b.end), dur: (parseChartDate(b.end) || 0) - (parseChartDate(b.start) || 0) }))
  const valid = parsed.filter(p => p.s && p.e && p.dur >= 0)
  if (!valid.length) return null
  const minAllTs = Math.min(...valid.map(p => p.s.getTime()))
  const maxAllTs = Math.max(...valid.map(p => p.e.getTime()))
  // totalSpan not needed for current bounds logic

  const durations = valid.map(p => p.dur).sort((a,b) => a - b)
  const pctIndex = Math.max(0, Math.floor((durations.length - 1) * 0.95))
  const capDur = durations[pctIndex] || durations[durations.length - 1]
  let nonOutliers = valid.filter(p => p.dur <= capDur)
  if (!nonOutliers.length) nonOutliers = valid
  let minUse = new Date(Math.min(...nonOutliers.map(p => p.s.getTime())))

  const padMs = 1000 * 60 * 60 * 24 * 3
  minUse = new Date(minUse.getTime() - padMs)
  return fmtGanttDate(minUse)
})

const chartEnd = computed(() => {
  // Helper: determine if a task is a leaf given a WBS list
  function isLeafTaskWithList(wbsList, t) {
    if (!t) return false
    if (!t.wbs) return true
    const key = String(t.wbs)
    return !wbsList.some(w => w && w !== key && w.startsWith(key + '.'))
  }
  // Prefer leaf tasks for ending bound
  const tasks = props.tasks || []
  if (tasks.length) {
    const wbsList = tasks.map(t => (t && t.wbs) ? String(t.wbs) : null)
    const leafDates = tasks.filter(t => isLeafTaskWithList(wbsList, t)).map(t => ({ s: parseChartDate(t.start || t._start), e: parseChartDate(t.end || t._end) })).filter(x => x.s || x.e)
    if (leafDates.length) {
      const ends = leafDates.map(x => x.e ? x.e.getTime() : -Infinity).filter(Boolean)
      const maxEnd = new Date(Math.max(...ends))
      const padMs = 1000 * 60 * 60 * 24 * 3
      return fmtGanttDate(new Date(maxEnd.getTime() + padMs))
    }
  }

  // fallback to bars-based percentile trimming
  const bars = (rows.value || []).flatMap(r => (r.bars || []).map(b => ({ start: b.start, end: b.end }))).filter(b => b.start && b.end)
  if (!bars.length) return null
  const parsed = bars.map(b => ({ s: parseChartDate(b.start), e: parseChartDate(b.end), dur: (parseChartDate(b.end) || 0) - (parseChartDate(b.start) || 0) }))
  const valid = parsed.filter(p => p.s && p.e && p.dur >= 0)
  if (!valid.length) return null
  const minAllTs = Math.min(...valid.map(p => p.s.getTime()))
  const maxAllTs = Math.max(...valid.map(p => p.e.getTime()))
  // totalSpan not needed for current bounds logic

  const durations = valid.map(p => p.dur).sort((a,b) => a - b)
  const pctIndex = Math.max(0, Math.floor((durations.length - 1) * 0.95))
  const capDur = durations[pctIndex] || durations[durations.length - 1]
  let nonOutliers = valid.filter(p => p.dur <= capDur)
  if (!nonOutliers.length) nonOutliers = valid
  let maxUse = new Date(Math.max(...nonOutliers.map(p => p.e.getTime())))

  const padMs = 1000 * 60 * 60 * 24 * 3
  maxUse = new Date(maxUse.getTime() + padMs)
  return fmtGanttDate(maxUse)
})

function parseChartDate(s) {
  if (!s && s !== 0) return null
  if (s instanceof Date) return s
  // our fmtGanttDate returns `YYYY-MM-DD HH:mm[:ss]` — convert to ISO for reliable parsing
  const str = String(s).trim()
  // replace first space between date and time with 'T'
  const iso = str.replace(' ', 'T')
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d
}

// startOfWeek not used; remove to satisfy lint

// endOfWeek helper not used; removed to satisfy lint

const chartMinWidth = computed(() => {
  const s = parseChartDate(chartStart.value)
  const e = parseChartDate(chartEnd.value)
  const pxPerWeek = 240
  const min = 800
  if (!s || !e) return min
  const weeks = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24 * 7)))
  return Math.max(min, weeks * pxPerWeek)
})

// Debug helpers: expose the computed rows and chart bounds so we can inspect in browser console
function exposeDebug() {
  if (typeof window === 'undefined') return
  const snapshot = () => ({ rows: rows.value, chartStart: chartStart.value, chartEnd: chartEnd.value, chartMinWidth: chartMinWidth.value })
  window.__GANTT_DEBUG = snapshot()
  if (console && console.log) {
    console.log('GANTT DEBUG:', window.__GANTT_DEBUG)
  }
}

onMounted(() => {
  exposeDebug()
})

watch([rows, chartStart, chartEnd, chartMinWidth], () => {
  exposeDebug()
}, { deep: true })
<template>
  <div></div>
</template>
.gantt-wrapper {
