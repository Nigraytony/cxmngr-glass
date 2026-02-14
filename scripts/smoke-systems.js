import puppeteer from 'puppeteer'
import fs from 'fs'

function plansPayload() {
  return [
    {
      key: 'basic',
      name: 'Basic',
      features: { issues: true, equipment: true, systems: false, spaces: false, templates: false, activities: false, tasks: false },
      limits: { issues: 1000, equipment: 1000, systems: 0, spaces: 0, templates: 0, activities: 0, tasks: 0 },
    },
    {
      key: 'standard',
      name: 'Standard',
      features: { issues: true, equipment: true, systems: false, spaces: true, templates: true, activities: true, tasks: false },
      limits: { issues: 100000, equipment: 100000, systems: 0, spaces: 100000, templates: 100000, activities: 100000, tasks: 0 },
    },
    {
      key: 'premium',
      name: 'Premium',
      features: { issues: true, equipment: true, systems: true, spaces: true, templates: true, activities: true, tasks: true },
      limits: { issues: 100000, equipment: 100000, systems: 100000, spaces: 100000, templates: 100000, activities: 100000, tasks: 100000 },
    },
  ]
}

function jsonResponse(req, status, obj, headers = {}) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': '*',
  }
  return req.respond({
    status,
    contentType: 'application/json',
    headers: { ...corsHeaders, ...(headers || {}) },
    body: JSON.stringify(obj),
  })
}

async function clickButtonByText(page, text) {
  const needle = String(text || '').trim()
  if (!needle) throw new Error('Missing button text')

  const found = await page.waitForFunction((t) => {
    const target = String(t || '').trim()
    const btns = Array.from(document.querySelectorAll('button'))
    return btns.some(b => String(b?.innerText || '').replace(/\s+/g, ' ').trim().includes(target))
  }, { timeout: 10_000 }, needle).then(() => true).catch(() => false)

  if (!found) throw new Error(`Button not found: ${needle}`)

  const clicked = await page.evaluate((t) => {
    const target = String(t || '').trim()
    const btns = Array.from(document.querySelectorAll('button'))
    const btn = btns.find(b => String(b?.innerText || '').replace(/\s+/g, ' ').trim().includes(target))
    if (!btn) return false
    try { btn.scrollIntoView({ block: 'center', inline: 'center' }) } catch (e) { /* ignore */ }
    ;(btn).click()
    return true
  }, needle)

  if (!clicked) throw new Error(`Button click failed: ${needle}`)
}

async function runScenario({ base, tier }) {
  const projectId = 'proj1'
  const apiBase = process.env.SMOKE_API_BASE || 'http://localhost:3000'

  const state = {
    apiBase,
    token: 'dev-token',
    user: {
      _id: 'dev',
      token: 'dev-token',
      firstName: 'Dev',
      lastName: 'User',
      email: 'dev@example.com',
      role: 'admin',
      projects: [{ _id: projectId, name: 'Demo Project', default: true }],
    },
    selectedProjectId: projectId,
  }

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const ctx = browser.createBrowserContext
    ? await browser.createBrowserContext()
    : await browser.createIncognitoBrowserContext()
  const page = await ctx.newPage()
  page.setDefaultTimeout(25_000)
  page.setDefaultNavigationTimeout(60_000)

  const results = {
    tier,
    base,
    apiBase,
    ok: false,
    steps: [],
    finalUrl: null,
    console: [],
    apiCalls: [],
    debug: {},
  }

  page.on('console', msg => results.console.push({ type: msg.type(), text: msg.text() }))
  page.on('pageerror', err => results.console.push({ type: 'pageerror', text: String(err) }))

  await page.evaluateOnNewDocument((s) => {
    try { localStorage.setItem('api.base', s.apiBase) } catch (e) {}
    try { localStorage.setItem('token', s.token) } catch (e) {}
    try { localStorage.setItem('user', JSON.stringify(s.user)) } catch (e) {}
    try { localStorage.setItem('selectedProjectId', s.selectedProjectId) } catch (e) {}
  }, state)

  const systemsEnabled = tier === 'premium'
  const sysId = 'sys1'
  let lastSystem = null

  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const url = req.url()
    const method = req.method()

    // Only mock API calls against the configured API base; let Vite assets/HMR continue.
    if (!url.startsWith(apiBase)) return req.continue()

    try {
      results.apiCalls.push({ method, url })
    } catch (e) {
      // ignore
    }

    // CORS preflight
    if (method === 'OPTIONS') {
      return req.respond({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } })
    }

    if (url.includes('/api/plans')) {
      return jsonResponse(req, 200, plansPayload())
    }

    if (url.includes('/api/users/me')) {
      return jsonResponse(req, 200, { user: state.user })
    }

    if (url.includes('/api/users/refresh')) {
      return jsonResponse(req, 200, { token: state.token, user: state.user })
    }

    if (url.includes(`/api/projects/${projectId}/opr/workshop`)) {
      return jsonResponse(req, 404, { error: 'Not found' })
    }

    if (url.includes('/api/projects/my-invites')) {
      return jsonResponse(req, 200, { invites: [] })
    }

    if (url.includes(`/api/projects/${projectId}`) && method === 'GET') {
      return jsonResponse(req, 200, {
        _id: projectId,
        name: 'Demo Project',
        project_type: 'demo',
        client: 'Demo',
        location: 'Local',
        building_type: 'N/A',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subscriptionTier: tier,
        subscriptionFeatures: {},
      })
    }

    if (url.includes(`/api/systems/project/${projectId}`) && method === 'GET') {
      if (!systemsEnabled) {
        return jsonResponse(req, 403, { code: 'FEATURE_NOT_IN_PLAN', feature: 'systems', tier })
      }
      const list = lastSystem ? [lastSystem] : []
      return jsonResponse(req, 200, list)
    }

    if (url.endsWith('/api/systems') && method === 'POST') {
      if (!systemsEnabled) {
        return jsonResponse(req, 403, { code: 'FEATURE_NOT_IN_PLAN', feature: 'systems', tier })
      }
      let body = {}
      try { body = JSON.parse(req.postData() || '{}') } catch (e) {}
      lastSystem = {
        _id: sysId,
        projectId,
        name: String(body.name || ''),
        tag: body.tag || undefined,
        type: body.type || undefined,
        description: body.description || undefined,
        parentSystem: body.parentSystem ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return jsonResponse(req, 200, lastSystem)
    }

    if (url.includes(`/api/systems/${sysId}`) && method === 'GET') {
      if (!systemsEnabled) {
        return jsonResponse(req, 403, { code: 'FEATURE_NOT_IN_PLAN', feature: 'systems', tier })
      }
      return jsonResponse(req, 200, lastSystem || { _id: sysId, projectId, name: 'HVAC' })
    }

    if (url.includes(`/api/systems/${sysId}`) && (method === 'PATCH' || method === 'PUT')) {
      if (!systemsEnabled) {
        return jsonResponse(req, 403, { code: 'FEATURE_NOT_IN_PLAN', feature: 'systems', tier })
      }
      let body = {}
      try { body = JSON.parse(req.postData() || '{}') } catch (e) {}
      lastSystem = { ...(lastSystem || { _id: sysId, projectId }), ...body, _id: sysId, updatedAt: new Date().toISOString() }
      return jsonResponse(req, 200, lastSystem)
    }

    if (url.includes(`/api/systems/${sysId}`) && method === 'DELETE') {
      lastSystem = null
      return jsonResponse(req, 200, { ok: true })
    }

    // Never fall through to the real backend during smoke tests.
    return jsonResponse(req, 404, { code: 'MOCK_NOT_IMPLEMENTED', method, url })
  })

  try {
    const t0 = Date.now()
    await page.goto(`${base}/app/systems`, { waitUntil: 'domcontentloaded' })
    results.steps.push({ name: 'navigate_systems', ms: Date.now() - t0 })

    try {
      results.debug.token = await page.evaluate(() => localStorage.getItem('token'))
      results.debug.user = await page.evaluate(() => {
        const raw = localStorage.getItem('user')
        return raw ? JSON.parse(raw) : null
      })
      results.debug.selectedProjectId = await page.evaluate(() => localStorage.getItem('selectedProjectId'))
      results.debug.apiBase = await page.evaluate(() => localStorage.getItem('api.base'))
    } catch (e) {
      // ignore
    }

    if (tier === 'premium') {
      // Systems list should render (even if empty)
      await page.waitForFunction(() => {
        const t = document.body?.innerText || ''
        return t.includes('Systems') && (t.includes('No systems yet.') || t.includes('systems'))
      }, { timeout: 15_000 })
      results.steps.push({ name: 'systems_list_rendered' })

      // Click add system
      await page.click('button[aria-label="Add system"]')
      await page.waitForFunction(() => location.pathname.includes('/app/systems/new') || /\/app\/systems\//.test(location.pathname), { timeout: 10_000 })
      results.steps.push({ name: 'open_new' })

      // Fill name and save
      await page.waitForSelector('input[placeholder="e.g., HVAC"]')
      await page.type('input[placeholder="e.g., HVAC"]', 'HVAC')
      await clickButtonByText(page, 'Save')

      // URL should update to sys id
      await page.waitForFunction(() => location.pathname.includes('/app/systems/sys1'), { timeout: 10_000 })
      results.steps.push({ name: 'create_saved' })

      // Back to list and verify row
      await clickButtonByText(page, 'Back')
      await page.waitForFunction(() => location.pathname.endsWith('/app/systems'), { timeout: 10_000 })
      await page.waitForFunction(() => (document.body?.innerText || '').includes('HVAC'), { timeout: 10_000 })
      results.steps.push({ name: 'created_visible_in_list' })
    } else {
      // Either router guard redirect OR in-page error banner.
      const ok = await page.waitForFunction(() => {
        const u = location.href
        const t = document.body?.innerText || ''
        return u.includes('upgrade=systems') || t.includes('Systems are not available on your current subscription plan')
      }, { timeout: 15_000 }).then(() => true).catch(() => false)

      if (!ok) {
        const url = await page.url()
        const text = await page.evaluate(() => (document.body?.innerText || '').slice(0, 2000))
        throw new Error(`Expected upgrade redirect or plan banner. url=${url} text=${text}`)
      }
      results.steps.push({ name: 'plan_gated' })
    }

    results.ok = true
  } catch (e) {
    results.error = String(e)
    try {
      results.finalUrl = await page.url()
      results.pageText = await page.evaluate(() => (document.body?.innerText || '').slice(0, 2000))
    } catch (_) {}
  } finally {
    try { results.finalUrl = results.finalUrl || await page.url() } catch (_) {}
    await ctx.close()
    await browser.close()
  }

  return results
}

async function run() {
  const base = process.env.SMOKE_BASE || 'http://localhost:5173'
  const outPath = process.env.SMOKE_OUT || './logs/smoke-systems.json'
  const scenarios = [
    { base, tier: 'premium' },
    { base, tier: 'basic' },
  ]

  const out = {
    base,
    scenarios: [],
    ok: true,
  }

  const writeOut = () => {
    try {
      fs.mkdirSync('./logs', { recursive: true })
      fs.writeFileSync(outPath, JSON.stringify(out, null, 2))
    } catch (e) {
      // ignore
    }
  }
  writeOut()

  for (const s of scenarios) {
    // eslint-disable-next-line no-console
    console.log(`[smoke-systems] running tier=${s.tier} against ${s.base}`)
    const r = await runScenario(s)
    out.scenarios.push(r)
    if (!r.ok) out.ok = false
    writeOut()
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(out, null, 2))
  writeOut()
  if (!out.ok) process.exit(2)
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e)
  process.exit(2)
})
