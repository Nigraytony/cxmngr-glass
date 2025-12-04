import puppeteer from 'puppeteer'

async function run() {
  const base = process.env.SMOKE_BASE || 'http://localhost:5173'
  const url = `${base}/tasks`
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultTimeout(20000)
  page.setDefaultNavigationTimeout(60000)

  const results = { url, actions: [] }

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const logs = []
  try {
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }))
    page.on('pageerror', err => logs.push({ type: 'pageerror', text: String(err) }))
    // set localStorage to bypass auth and select a project
    await page.goto('about:blank')
    await page.evaluate(() => {
      try { localStorage.setItem('token', 'dev-token') } catch (e) {}
      try { localStorage.setItem('user', JSON.stringify({ _id: 'dev', token: 'dev-token', firstName: 'Dev', lastName: 'User', email: 'dev@example.com', role: 'admin', projects: [{ _id: 'proj1', default: true }] })) } catch (e) {}
      try { localStorage.setItem('selectedProjectId', 'proj1') } catch (e) {}
    })

    // intercept API requests and mock tasks + user/me responses so UI renders predictably
    await page.setRequestInterception(true)
    page.on('request', req => {
      const url = req.url()
      if (url.includes('/api/tasks')) {
        const body = JSON.stringify({ tasks: [
          { _id: '1', wbs: '1', name: 'Parent Task', description: '', duration: null, start: '11/01/2025', end: '11/05/2025', percentComplete: 50, cost: 100 },
          { _id: '2', wbs: '1.1', name: 'Child A', description: '', duration: 2, start: '11/01/2025', end: '11/02/2025', percentComplete: 100, cost: 40 },
          { _id: '3', wbs: '1.2', name: 'Child B', description: '', duration: 3, start: '11/03/2025', end: '11/05/2025', percentComplete: 0, cost: 60 }
        ] })
        req.respond({ status: 200, contentType: 'application/json', body })
        return
      }
      if (url.includes('/api/users/me')) {
        const body = JSON.stringify({ user: { _id: 'dev', firstName: 'Dev', lastName: 'User', email: 'dev@example.com', role: 'admin', projects: [{ _id: 'proj1', default: true }] } })
        req.respond({ status: 200, contentType: 'application/json', body })
        return
      }
      req.continue()
    })

    const t0 = Date.now()
    // retry navigation a few times because the dev server or client router may take a moment to be ready
    let navigated = false
    for (let attempt = 0; attempt < 3 && !navigated; attempt++) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' })
        navigated = true
      } catch (e) {
        if (attempt < 2) await delay(500)
      }
    }
    results.load = Date.now() - t0

    // wait for any of the possible ready indicators: the tasks table, the gantt chart, or helpful status text
    // If the app shows the Sign In page, retry by setting localStorage again and reloading.
    let ready = false
    for (let attempt = 0; attempt < 3 && !ready; attempt++) {
      try {
        await page.waitForFunction(() => {
          const hasTable = !!document.querySelector('table')
          const hasGantt = !!document.querySelector('g-gantt-chart') || !!document.querySelector('.g-gantt-chart')
          const text = document.body && document.body.innerText ? document.body.innerText : ''
          const hasSelectProject = text.includes('Select a project to view its tasks') || text.includes('Select a project')
          const noTasks = text.includes('No tasks found for this project')
          return hasTable || hasGantt || hasSelectProject || noTasks
        }, { timeout: 10000 })
        ready = true
      } catch (e) {
        // inspect page to see if it's the sign-in page
        const bodyText = await page.evaluate(() => document.body && document.body.innerText ? document.body.innerText : '')
        if (/sign in/i.test(bodyText)) {
          // set localStorage again and force navigation to tasks
          await page.evaluate(() => {
            try { localStorage.setItem('token', 'dev-token') } catch (e) {}
            try { localStorage.setItem('user', JSON.stringify({ _id: 'dev', token: 'dev-token', firstName: 'Dev', lastName: 'User', email: 'dev@example.com', role: 'admin', projects: [{ _id: 'proj1', default: true }] })) } catch (e) {}
            try { localStorage.setItem('selectedProjectId', 'proj1') } catch (e) {}
            // reload the app so the stores pick up the new localStorage
            location.assign('/tasks')
          })
          // allow some time for SPA to reinitialize
            await delay(1500)
          continue
        }
        // otherwise wait a bit before retrying
        await page.waitForTimeout(500)
      }
    }

    // count rows
    const rowsBefore = await page.$$eval('tbody tr', els => els.length)

    // try expand/collapse first parent with aria-expanded
    const expandHandle = await page.$('table button[aria-expanded]')
    if (expandHandle) {
      const start = Date.now()
      await expandHandle.click()
      // wait for row count to change or small delay
      let rowsAfter = rowsBefore
      for (let i=0;i<20;i++) {
      await delay(50)
        rowsAfter = await page.$$eval('tbody tr', els => els.length)
        if (rowsAfter !== rowsBefore) break
      }
      results.actions.push({ name: 'expand_toggle', durationMs: Date.now() - start, rowsBefore, rowsAfter })
    } else {
      results.actions.push({ name: 'expand_toggle', skipped: true })
    }

    // toggle the first checkbox (complete)
    const chk = await page.$('table input[type=checkbox]')
    if (chk) {
      const start = Date.now()
      await chk.click()
      // small wait for optimistic UI update
      await delay(200)
      results.actions.push({ name: 'toggle_checkbox', durationMs: Date.now() - start })
    } else {
      results.actions.push({ name: 'toggle_checkbox', skipped: true })
    }

    // open first edit modal
    const editBtn = await page.$('button[title="Edit"]')
    if (editBtn) {
      const start = Date.now()
      await editBtn.click()
      // wait for modal header 'Edit Task' or new modal
      try {
        await page.waitForXPath("//div[contains(text(), 'Edit Task') or contains(text(), 'New Task')]", { timeout: 3000 })
        results.actions.push({ name: 'open_edit', durationMs: Date.now() - start, opened: true })
      } catch (e) {
        results.actions.push({ name: 'open_edit', durationMs: Date.now() - start, opened: false })
      }
    } else {
      results.actions.push({ name: 'open_edit', skipped: true })
    }

  } catch (err) {
    try {
      const snap = await page.content()
      results.pageSnippet = snap.slice(0, 2000)
    } catch (e) {}
    results.error = String(err)
    results.console = logs
      try {
        results.pageText = await page.evaluate(() => document.body && document.body.innerText ? document.body.innerText : '')
      } catch (e) {}
  } finally {
    await browser.close()
  }

  console.log(JSON.stringify(results, null, 2))
  return results
}

// Execute when run directly
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(2) })
