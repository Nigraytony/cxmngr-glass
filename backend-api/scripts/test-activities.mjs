#!/usr/bin/env node
/*
 End-to-end manual tests for Activities feature:
 - Sanitization of descriptionHtml
 - Photo upload limits (size and count)

 Usage (bash/zsh):
   export API_BASE="http://localhost:4242/api"
   export TOKEN="<jwt>"
   export PROJECT_ID="<projectId>"
   node scripts/test-activities.mjs

 Exits with non-zero on failure. Prints PASS/FAIL per check.
*/
import axios from 'axios'
import FormData from 'form-data'

const API_BASE = process.env.API_BASE || 'http://localhost:4242/api'
const TOKEN = process.env.TOKEN || ''
const PROJECT_ID = process.env.PROJECT_ID || ''

if (!TOKEN) {
  console.error('FAIL: TOKEN env is required (JWT)')
  process.exit(2)
}
if (!PROJECT_ID) {
  console.error('FAIL: PROJECT_ID env is required')
  process.exit(2)
}

const http = axios.create({
  baseURL: API_BASE,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  },
  validateStatus: () => true
})

function logPass(msg) { console.log(`PASS: ${msg}`) }
function logFail(msg) { console.error(`FAIL: ${msg}`) }

async function createActivity(name, descriptionHtml) {
  const payload = {
    name,
    descriptionHtml,
    type: 'Site Visit Review',
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    projectId: PROJECT_ID,
    location: 'Test Lab',
    systems: ['AHU-1']
  }
  const res = await http.post('/activities', payload)
  if (res.status !== 201) throw new Error(`Create activity failed: ${res.status} ${JSON.stringify(res.data)}`)
  return res.data
}

async function fetchActivity(id) {
  const res = await http.get(`/activities/${id}`)
  if (res.status !== 200) throw new Error(`Fetch activity failed: ${res.status}`)
  return res.data
}

function makeBuffer(sizeBytes) {
  const buf = Buffer.alloc(sizeBytes, 0)
  // add minimal JPEG header bytes to look image-like; server trusts mimetype, but for completeness
  buf[0] = 0xFF; buf[1] = 0xD8; buf[2] = 0xFF; buf[3] = 0xE0
  return buf
}

async function uploadPhotos(id, files) {
  const fd = new FormData()
  for (const f of files) {
    fd.append('photos', f.buffer, { filename: f.filename, contentType: 'image/jpeg' })
  }
  const res = await http.post(`/activities/${id}/photos`, fd, { headers: { ...fd.getHeaders() } })
  return res
}

async function run() {
  let failed = false

  // 1) Sanitization test
  const dirtyHtml = '<h1>Title</h1><img src=x onerror="alert(1)"><script>alert(2)</script><p>ok</p>'
  let act
  try {
    act = await createActivity('Sanitize Test', dirtyHtml)
    logPass('Created activity for sanitization')
  } catch (e) {
    failed = true
    logFail(`Create activity: ${e.message}`)
  }

  if (act) {
    try {
      const fresh = await fetchActivity(act._id || act.id)
      const html = fresh.descriptionHtml || ''
      const hasScript = /<script/i.test(html)
      const hasOnError = /onerror=/i.test(html)
      if (!hasScript && !hasOnError) {
        logPass('descriptionHtml sanitized (no <script>, no onerror=)')
      } else {
        failed = true
        logFail(`Sanitization failed. html=${html}`)
      }
    } catch (e) {
      failed = true
      logFail(`Fetch activity after create failed: ${e.message}`)
    }
  }

  // 2) Photo uploads: valid small files, then oversize, then exceed max count
  let act2
  try {
    act2 = await createActivity('Photos Test', '<p>photos</p>')
    logPass('Created activity for photo tests')
  } catch (e) {
    failed = true
    logFail(`Create activity for photos: ${e.message}`)
  }

  if (act2) {
    const id2 = act2._id || act2.id
    try {
      const small1 = makeBuffer(10 * 1024)
      const small2 = makeBuffer(12 * 1024)
      const resSmall = await uploadPhotos(id2, [
        { filename: 'a1.jpg', buffer: small1 },
        { filename: 'a2.jpg', buffer: small2 }
      ])
      if (resSmall.status === 200) logPass('Uploaded small photos (<=250KB)')
      else { failed = true; logFail(`Upload small photos failed: ${resSmall.status} ${JSON.stringify(resSmall.data)}`) }
    } catch (e) {
      failed = true
      logFail(`Upload small photos threw: ${e.message}`)
    }

    try {
      const big = makeBuffer(300 * 1024)
      const resBig = await uploadPhotos(id2, [{ filename: 'too-big.jpg', buffer: big }])
      if (resBig.status === 400) logPass('Rejected oversize photo (>250KB)')
      else { failed = true; logFail(`Oversize photo not rejected: ${resBig.status}`) }
    } catch (e) {
      // If server error is thrown, flag as fail
      failed = true
      logFail(`Oversize upload threw: ${e.message}`)
    }

    try {
      // Already 2 photos uploaded; now try to add 15 more to exceed 16 total
      const fifteen = Array.from({ length: 15 }, (_, i) => ({ filename: `f${i+1}.jpg`, buffer: makeBuffer(8 * 1024) }))
      const resMany = await uploadPhotos(id2, fifteen)
      if (resMany.status === 400) logPass('Rejected total photos > 16')
      else { failed = true; logFail(`Exceeding photo count not rejected: ${resMany.status}`) }
    } catch (e) {
      failed = true
      logFail(`Exceeding count upload threw: ${e.message}`)
    }
  }

  if (failed) process.exit(1)
  else console.log('All checks passed')
}

run().catch(err => {
  console.error('Unexpected error', err)
  process.exit(1)
})
