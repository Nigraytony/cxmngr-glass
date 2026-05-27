const request = require('supertest')
const mongoose = require('mongoose')
const assert = require('assert')
const { clearDb, withCsrf } = require('./testUtils')

process.env.NODE_ENV = process.env.NODE_ENV || 'test'

describe('Final Report routes', function () {
  this.timeout(30000)
  let app

  before(async () => {
    if (!process.env.MONGODB_URI || !String(process.env.MONGODB_URI).startsWith('mongodb')) {
      process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test'
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'

    try {
      delete require.cache[require.resolve('../index')]
    } catch (e) {}
    app = require('../index.js')

    const deadline = Date.now() + 10000
    while (mongoose.connection.readyState !== 1 && Date.now() < deadline) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 100))
    }
    if (mongoose.connection.readyState !== 1) throw new Error('Failed to connect to mongo')
    await clearDb()
  })

  after(async () => {
    try {
      await mongoose.disconnect()
    } catch (e) {}
  })

  beforeEach(async () => {
    await clearDb()
  })

  /**
   * Helpers — register an owner, create a project, set up users with various
   * project roles. Returns { ownerToken, projectId, members } for the test.
   */
  async function setupProject() {
    const Project = require('../models/project')
    const User = require('../models/user')

    // Owner — becomes a project admin by default when they create the project.
    const ownerRes = await withCsrf(
      request(app).post('/api/users/register'),
    ).send({
      email: 'owner@example.com',
      password: 'password123',
      firstName: 'Pat',
      lastName: 'Owner',
      company: 'CxCo',
    })
    assert.strictEqual(ownerRes.status, 201, 'owner registration failed')
    const ownerToken = ownerRes.body.accessToken

    const projRes = await withCsrf(request(app).post('/api/projects'))
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Sample Project', client: 'Big Owner Co.' })
    assert.strictEqual(projRes.status, 201, 'project creation failed')
    const projectId = String(projRes.body._id)

    // Add three team members directly via the model so we can pin specific
    // role strings without exercising the invite flow.
    const stub = (over) => ({
      email: over.email,
      password: 'password123',
      firstName: over.firstName,
      lastName: over.lastName,
      role: over.role || 'user',
      contact: { company: 'TestCo' },
    })
    const cxa = await User.create(stub({ email: 'cxa@example.com', firstName: 'Cee', lastName: 'Ay' }))
    const member = await User.create(stub({ email: 'member@example.com', firstName: 'Bob', lastName: 'Member' }))
    const globalAdmin = await User.create(
      stub({ email: 'admin@example.com', firstName: 'Glo', lastName: 'Admin', role: 'globaladmin' }),
    )

    await Project.findByIdAndUpdate(projectId, {
      $push: {
        team: {
          $each: [
            {
              _id: cxa._id,
              firstName: cxa.firstName,
              lastName: cxa.lastName,
              email: cxa.email,
              role: 'CxA',
              status: 'active',
            },
            {
              _id: member._id,
              firstName: member.firstName,
              lastName: member.lastName,
              email: member.email,
              role: 'Other',
              status: 'active',
            },
          ],
        },
      },
    })

    // Tokens for the seeded users — use the login route to mint real JWTs.
    async function tokenFor(email) {
      const res = await withCsrf(request(app).post('/api/users/login')).send({
        email,
        password: 'never-used-because-we-set-it-below',
      })
      return res
    }
    // The seeded users don't have real passwords, so we'll login the owner
    // and rely on /api/users/admin to act as different members. Simpler:
    // generate JWTs directly using the same secret the app uses.
    const jwt = require('jsonwebtoken')
    const sign = (u) =>
      jwt.sign(
        { sub: String(u._id), email: u.email, role: u.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' },
      )

    return {
      ownerToken,
      projectId,
      tokens: {
        cxa: sign(cxa),
        member: sign(member),
        globalAdmin: sign(globalAdmin),
      },
      userIds: { cxa: cxa._id, member: member._id, globalAdmin: globalAdmin._id },
    }
  }

  it('lazy-creates the report with the default sections on first GET', async () => {
    const { ownerToken, projectId } = await setupProject()

    const res = await request(app)
      .get(`/api/projects/${projectId}/final-report`)
      .set('Authorization', `Bearer ${ownerToken}`)
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.status, 'draft')
    assert.strictEqual(res.body.currentVersion, 0)
    assert(Array.isArray(res.body.sections))
    // 22 lifecycle-ordered defaults (Phase 1 expansion): predesign →
    // design → construction → occupancy → closeout. If the canonical list
    // changes, update DEFAULT_SECTIONS in the model and this assertion
    // together.
    assert.strictEqual(res.body.sections.length, 22)
    const keys = res.body.sections.map((s) => s.key)
    assert.deepStrictEqual(keys[0], 'revisions')
    assert.deepStrictEqual(keys[keys.length - 1], 'sign-offs')
    // Spot-check representative sections + data sources.
    const scoped = res.body.sections.find((s) => s.key === 'scoped-systems')
    assert.strictEqual(scoped.type, 'data')
    assert.strictEqual(scoped.dataSource, 'scoped-systems')
    const issues = res.body.sections.find((s) => s.key === 'issues-log')
    assert.strictEqual(issues.type, 'data')
    assert.strictEqual(issues.dataSource, 'issues')
    // OPR Coverage is the headline LEED-audit section; verify it's wired.
    const oprCov = res.body.sections.find((s) => s.key === 'opr-coverage')
    assert.strictEqual(oprCov.type, 'data')
    assert.strictEqual(oprCov.dataSource, 'opr-coverage')
    // Project Description is a data section (renders project.description).
    const desc = res.body.sections.find((s) => s.key === 'project-description')
    assert.strictEqual(desc.type, 'data')
    assert.strictEqual(desc.dataSource, 'project-description')
  })

  it('is idempotent — second GET does not duplicate sections', async () => {
    const { ownerToken, projectId } = await setupProject()
    const first = await request(app)
      .get(`/api/projects/${projectId}/final-report`)
      .set('Authorization', `Bearer ${ownerToken}`)
    const second = await request(app)
      .get(`/api/projects/${projectId}/final-report`)
      .set('Authorization', `Bearer ${ownerToken}`)
    assert.strictEqual(first.body.sections.length, second.body.sections.length)
    assert.strictEqual(String(first.body._id), String(second.body._id))
  })

  it('allows a CxA team member to edit prose content', async () => {
    const { projectId, tokens } = await setupProject()
    // Prime
    await request(app)
      .get(`/api/projects/${projectId}/final-report`)
      .set('Authorization', `Bearer ${tokens.cxa}`)

    const get = await request(app)
      .get(`/api/projects/${projectId}/final-report`)
      .set('Authorization', `Bearer ${tokens.cxa}`)
    const sections = get.body.sections.map((s) =>
      s.key === 'lessons-learned' ? { ...s, contentHtml: '<p>Hello</p>' } : s,
    )

    const put = await withCsrf(
      request(app).put(`/api/projects/${projectId}/final-report`),
    )
      .set('Authorization', `Bearer ${tokens.cxa}`)
      .send({ sections })
    assert.strictEqual(put.status, 200)
    const lessons = put.body.sections.find((s) => s.key === 'lessons-learned')
    assert.strictEqual(lessons.contentHtml, '<p>Hello</p>')
  })

  it('rejects edits from non-CxA / non-admin members', async () => {
    const { projectId, tokens } = await setupProject()
    await request(app)
      .get(`/api/projects/${projectId}/final-report`)
      .set('Authorization', `Bearer ${tokens.member}`)

    const put = await withCsrf(
      request(app).put(`/api/projects/${projectId}/final-report`),
    )
      .set('Authorization', `Bearer ${tokens.member}`)
      .send({ sections: [] })
    assert.strictEqual(put.status, 403)
  })

  it('refreshes the scoped-systems data source with derived progress status', async () => {
    const { ownerToken, projectId } = await setupProject()
    const Equipment = require('../models/equipment')
    await Equipment.create([
      {
        projectId,
        tag: 'AHU-1',
        title: 'Air Handler 1',
        type: 'AHU',
        system: 'HVAC',
        // Nothing started yet → Not Started
        checklists: [],
        functionalTests: [],
      },
      {
        projectId,
        tag: 'AHU-2',
        title: 'Air Handler 2',
        type: 'AHU',
        system: 'HVAC',
        // 2 checklist sections, one complete; 1 FPT with no status → In Progress
        checklists: [
          { is_complete: true, questions: [] },
          { is_complete: false, questions: [{ answer: null }] },
        ],
        functionalTests: [{ status: null }],
      },
      {
        projectId,
        tag: 'P-1',
        title: 'Pump 1',
        type: 'Pump',
        system: 'HVAC',
        // 1 checklist section complete, 1 FPT pass → Complete
        checklists: [{ is_complete: true, questions: [] }],
        functionalTests: [{ status: 'pass' }],
      },
    ])

    await request(app)
      .get(`/api/projects/${projectId}/final-report`)
      .set('Authorization', `Bearer ${ownerToken}`)

    const res = await withCsrf(
      request(app).post(
        `/api/projects/${projectId}/final-report/sections/scoped-systems/refresh`,
      ),
    ).set('Authorization', `Bearer ${ownerToken}`)
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.dataSource, 'scoped-systems')
    assert.strictEqual(res.body.data.rows.length, 3)
    const byTag = Object.fromEntries(res.body.data.rows.map((r) => [r.tag, r]))
    assert.strictEqual(byTag['AHU-1'].status, 'Not Started')
    assert.strictEqual(byTag['AHU-2'].status, 'In Progress')
    assert.strictEqual(byTag['P-1'].status, 'Complete')
    assert.strictEqual(byTag['AHU-2'].checklistsCount, 2)
    assert.strictEqual(byTag['AHU-2'].fptsCount, 1)
  })

  it('refreshes the issues data source with current data', async () => {
    const { ownerToken, projectId } = await setupProject()
    const Issue = require('../models/issue')
    await Issue.create([
      {
        projectId,
        number: 2,
        title: 'Second issue',
        description: 'desc',
        severity: 'Medium',
        status: 'Open',
      },
      {
        projectId,
        number: 1,
        title: 'First issue',
        description: 'desc',
        severity: 'High',
        status: 'Open',
      },
    ])

    // Prime the report
    await request(app)
      .get(`/api/projects/${projectId}/final-report`)
      .set('Authorization', `Bearer ${ownerToken}`)

    const res = await withCsrf(
      request(app).post(
        `/api/projects/${projectId}/final-report/sections/issues-log/refresh`,
      ),
    ).set('Authorization', `Bearer ${ownerToken}`)
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.dataSource, 'issues')
    assert.strictEqual(res.body.data.rows.length, 2)
    // Sorted by issue number ascending
    assert.strictEqual(res.body.data.rows[0].number, 1)
    assert.strictEqual(res.body.data.rows[1].number, 2)
  })

  it('locks to final, snapshots a release, and bumps currentVersion', async () => {
    const { ownerToken, projectId } = await setupProject()
    await request(app)
      .get(`/api/projects/${projectId}/final-report`)
      .set('Authorization', `Bearer ${ownerToken}`)

    const lock = await withCsrf(
      request(app).post(`/api/projects/${projectId}/final-report/lock`),
    )
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'final', note: 'v1 delivery' })

    assert.strictEqual(lock.status, 200)
    assert.strictEqual(lock.body.status, 'final')
    assert.strictEqual(lock.body.currentVersion, 1)
    assert.strictEqual(lock.body.releases.length, 1)
    assert.strictEqual(lock.body.releases[0].version, 1)
    assert.strictEqual(lock.body.releases[0].note, 'v1 delivery')
  })

  it('rejects edits to a locked report with 409', async () => {
    const { ownerToken, projectId } = await setupProject()
    await request(app)
      .get(`/api/projects/${projectId}/final-report`)
      .set('Authorization', `Bearer ${ownerToken}`)
    await withCsrf(
      request(app).post(`/api/projects/${projectId}/final-report/lock`),
    )
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'final' })

    const put = await withCsrf(
      request(app).put(`/api/projects/${projectId}/final-report`),
    )
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ sections: [] })
    assert.strictEqual(put.status, 409)
    assert.strictEqual(put.body.code, 'FINAL_REPORT_LOCKED')
  })

  // --------------------------------------------------------------------
  // Phase 3 — HTML builder for PDF (unit-tests the template directly
  // without spinning up Puppeteer; the route is integration-tested by
  // the lock-final flow exercising it on every release).
  // --------------------------------------------------------------------

  it('buildReportHtml renders a valid self-contained document', async () => {
    const { buildReportHtml } = require('../services/finalReportHtml')
    const report = {
      _id: 'r1',
      projectId: 'p1',
      status: 'draft',
      currentVersion: 0,
      cover: { title: 'Commissioning Final Report' },
      sections: [
        { key: 'purpose', title: 'Purpose', type: 'prose', order: 10, enabled: true, contentHtml: '<p>Hello <strong>world</strong>.</p>' },
        { key: 'opr-coverage', title: 'OPR Coverage', type: 'data', dataSource: 'opr-coverage', order: 20, enabled: true },
      ],
      releases: [],
    }
    const project = {
      _id: 'p1',
      name: 'Test Tower',
      client: 'Acme',
      location: 'Atlanta, GA',
      commissioning_agent: { firstName: 'Cee', lastName: 'Ay', company: 'CxCo' },
    }
    const sectionData = {
      'opr-coverage': {
        rows: [
          { rank: 1, text: 'Temps 68-74F', category: 'Comfort', totalLinks: 2, passLinks: 2, failLinks: 0, naLinks: 0, unverifiedLinks: 0, overallStatus: 'pass', links: [] },
        ],
        totalCount: 1,
        verifiedCount: 1,
        failedCount: 0,
        naCount: 0,
        unverifiedCount: 0,
      },
    }
    const html = buildReportHtml({ report, project, sectionData })
    // Self-contained document
    assert(html.startsWith('<!doctype html>'), 'expected DOCTYPE')
    assert(html.includes('<style>'), 'expected inline styles')
    // Cover renders project name + client
    assert(html.includes('Test Tower'))
    assert(html.includes('Acme'))
    // TOC entries link to section anchors
    assert(html.includes('href="#section-purpose"'))
    assert(html.includes('href="#section-opr-coverage"'))
    // Prose section preserves allowed inline markup
    assert(html.includes('<strong>world</strong>'))
    // OPR coverage renders the row + pass pill
    assert(html.includes('Temps 68-74F'))
    assert(html.includes('pill-pass'))
  })

  // --------------------------------------------------------------------
  // Phase 1 data source coverage
  // --------------------------------------------------------------------

  it('renders project description directly from the Project model', async () => {
    const { ownerToken, projectId } = await setupProject()
    const Project = require('../models/project')
    await Project.findByIdAndUpdate(projectId, {
      $set: {
        description: 'Three-story lab + office building, 80,000 sqft.',
        building_type: 'Lab',
      },
    })
    await request(app)
      .get(`/api/projects/${projectId}/final-report`)
      .set('Authorization', `Bearer ${ownerToken}`)

    const res = await withCsrf(
      request(app).post(
        `/api/projects/${projectId}/final-report/sections/project-description/refresh`,
      ),
    ).set('Authorization', `Bearer ${ownerToken}`)
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.data.description, 'Three-story lab + office building, 80,000 sqft.')
    assert.strictEqual(res.body.data.buildingType, 'Lab')
  })

  it('groups activities into ASHRAE phases by type when phase is not set', async () => {
    const { ownerToken, projectId } = await setupProject()
    const Activity = require('../models/activity')
    await Activity.create([
      { projectId, name: 'OPR Kickoff', type: 'OPR Review' },
      { projectId, name: '50% CD Review', type: 'Design Review' },
      { projectId, name: 'CWS FPT', type: 'Functional Test' },
      { projectId, name: '10-month Warranty', type: 'Warranty Review' },
    ])
    await request(app)
      .get(`/api/projects/${projectId}/final-report`)
      .set('Authorization', `Bearer ${ownerToken}`)

    const res = await withCsrf(
      request(app).post(
        `/api/projects/${projectId}/final-report/sections/activities-by-phase/refresh`,
      ),
    ).set('Authorization', `Bearer ${ownerToken}`)
    assert.strictEqual(res.status, 200)
    const by = Object.fromEntries(res.body.data.groups.map((g) => [g.phase, g.rows]))
    assert.strictEqual(by.predesign.length, 1)
    assert.strictEqual(by.design.length, 1)
    assert.strictEqual(by.construction.length, 1)
    assert.strictEqual(by.occupancy.length, 1)
  })

  it('rolls up OPR coverage with overall pass/fail/na/unverified status', async () => {
    const { ownerToken, projectId } = await setupProject()
    const OprItem = require('../models/oprItem')
    const OprCategory = require('../models/oprCategory')
    const OprLinkEvaluation = require('../models/oprLinkEvaluation')

    // Build a small category + 3 OPR items (pass / fail / unverified).
    const cat = await OprCategory.create({
      orgId: projectId,
      projectId,
      name: 'Thermal Comfort',
      sortOrder: 1,
      createdBy: new mongoose.Types.ObjectId(),
    })
    const items = await OprItem.create([
      { orgId: projectId, projectId, categoryId: cat._id, text: 'Temps 68–74F', score: 30, rank: 1, createdBy: new mongoose.Types.ObjectId() },
      { orgId: projectId, projectId, categoryId: cat._id, text: 'RH 50–65%', score: 25, rank: 2, createdBy: new mongoose.Types.ObjectId() },
      { orgId: projectId, projectId, categoryId: cat._id, text: 'No odors', score: 20, rank: 3, createdBy: new mongoose.Types.ObjectId() },
    ])
    // Item 1: 2 pass links → overall pass
    // Item 2: 1 fail link → overall fail
    // Item 3: no links → overall unverified
    await OprLinkEvaluation.create([
      { orgId: projectId, projectId, oprItemId: items[0]._id, contextType: 'equipment', contextId: new mongoose.Types.ObjectId(), targetType: 'functional_test_step', status: 'pass' },
      { orgId: projectId, projectId, oprItemId: items[0]._id, contextType: 'equipment', contextId: new mongoose.Types.ObjectId(), targetType: 'checklist_question', status: 'pass' },
      { orgId: projectId, projectId, oprItemId: items[1]._id, contextType: 'issue', contextId: new mongoose.Types.ObjectId(), targetType: 'issue', status: 'fail' },
    ])

    await request(app)
      .get(`/api/projects/${projectId}/final-report`)
      .set('Authorization', `Bearer ${ownerToken}`)

    const res = await withCsrf(
      request(app).post(
        `/api/projects/${projectId}/final-report/sections/opr-coverage/refresh`,
      ),
    ).set('Authorization', `Bearer ${ownerToken}`)
    assert.strictEqual(res.status, 200)
    const data = res.body.data
    assert.strictEqual(data.totalCount, 3)
    assert.strictEqual(data.verifiedCount, 1)
    assert.strictEqual(data.failedCount, 1)
    assert.strictEqual(data.unverifiedCount, 1)
    const byRank = Object.fromEntries(data.rows.map((r) => [r.rank, r]))
    assert.strictEqual(byRank[1].overallStatus, 'pass')
    assert.strictEqual(byRank[1].passLinks, 2)
    assert.strictEqual(byRank[2].overallStatus, 'fail')
    assert.strictEqual(byRank[3].overallStatus, 'unverified')
  })

  it('returns only issues with a non-empty recommendation', async () => {
    const { ownerToken, projectId } = await setupProject()
    const Issue = require('../models/issue')
    await Issue.create([
      { projectId, number: 1, title: 'A', description: 'd', system: 'HVAC', recommendation: 'Replace fan motor' },
      { projectId, number: 2, title: 'B', description: 'd', system: 'HVAC', recommendation: '' },
      { projectId, number: 3, title: 'C', description: 'd', system: 'Plumbing', recommendation: 'Install isolation valve' },
    ])
    await request(app)
      .get(`/api/projects/${projectId}/final-report`)
      .set('Authorization', `Bearer ${ownerToken}`)

    const res = await withCsrf(
      request(app).post(
        `/api/projects/${projectId}/final-report/sections/recommendations/refresh`,
      ),
    ).set('Authorization', `Bearer ${ownerToken}`)
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.data.totalCount, 2)
    const systems = res.body.data.groups.map((g) => g.system).sort()
    assert.deepStrictEqual(systems, ['HVAC', 'Plumbing'])
  })

  it('returns training sessions with attendee counts', async () => {
    const { ownerToken, projectId } = await setupProject()
    const Activity = require('../models/activity')
    await Activity.create({
      projectId,
      name: 'HVAC O&M Training',
      type: 'Training Review',
      startDate: new Date('2025-09-15'),
      attendees: [
        { name: 'Bob', company: 'BSC', email: 'b@x.com', role: 'Operator', signedIn: true },
        { name: 'Alice', company: 'BSC', email: 'a@x.com', role: 'Operator', signedIn: true },
      ],
    })
    await request(app)
      .get(`/api/projects/${projectId}/final-report`)
      .set('Authorization', `Bearer ${ownerToken}`)

    const res = await withCsrf(
      request(app).post(
        `/api/projects/${projectId}/final-report/sections/training-verification/refresh`,
      ),
    ).set('Authorization', `Bearer ${ownerToken}`)
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.data.totalCount, 1)
    assert.strictEqual(res.body.data.rows[0].attendeeCount, 2)
  })

  it('only allows a global admin to unlock', async () => {
    const { ownerToken, projectId, tokens } = await setupProject()
    await request(app)
      .get(`/api/projects/${projectId}/final-report`)
      .set('Authorization', `Bearer ${ownerToken}`)
    await withCsrf(
      request(app).post(`/api/projects/${projectId}/final-report/lock`),
    )
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'final' })

    // CxA cannot unlock
    const cxaTry = await withCsrf(
      request(app).post(`/api/projects/${projectId}/final-report/unlock`),
    ).set('Authorization', `Bearer ${tokens.cxa}`)
    assert.strictEqual(cxaTry.status, 403)

    // Project owner cannot unlock either
    const ownerTry = await withCsrf(
      request(app).post(`/api/projects/${projectId}/final-report/unlock`),
    ).set('Authorization', `Bearer ${ownerToken}`)
    assert.strictEqual(ownerTry.status, 403)

    // Global admin can — and the release stays preserved.
    // We need to add the global admin to the project team first; the access
    // check requires membership before role permits unlock.
    const Project = require('../models/project')
    const User = require('../models/user')
    const ga = await User.findOne({ email: 'admin@example.com' })
    await Project.findByIdAndUpdate(projectId, {
      $push: {
        team: {
          _id: ga._id,
          firstName: ga.firstName,
          lastName: ga.lastName,
          email: ga.email,
          role: 'admin',
          status: 'active',
        },
      },
    })

    const gaTry = await withCsrf(
      request(app).post(`/api/projects/${projectId}/final-report/unlock`),
    ).set('Authorization', `Bearer ${tokens.globalAdmin}`)
    assert.strictEqual(gaTry.status, 200)
    assert.strictEqual(gaTry.body.status, 'draft')
    assert.strictEqual(gaTry.body.releases.length, 1)
  })
})
