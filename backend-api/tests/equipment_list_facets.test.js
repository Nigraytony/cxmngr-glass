const request = require('supertest')
const mongoose = require('mongoose')
const assert = require('assert')
const { clearDb } = require('./testUtils')

process.env.NODE_ENV = process.env.NODE_ENV || 'test'

describe('Equipment list facets robustness', function () {
  this.timeout(30000)

  let app

  before(async () => {
    // Prefer external MongoDB if provided (Atlas or CI service). If absent, default to localhost service.
    if (!process.env.MONGODB_URI || !String(process.env.MONGODB_URI).startsWith('mongodb')) {
      process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test'
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'

    try { delete require.cache[require.resolve('../index')] } catch (e) {}
    app = require('../index.js')

    const deadline = Date.now() + 10000
    while (mongoose.connection.readyState !== 1 && Date.now() < deadline) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 100))
    }
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Failed to connect to mongo')
    }
    await clearDb()
  })

  after(async () => {
    try { await mongoose.disconnect() } catch (e) {}
  })

  beforeEach(async () => {
    await clearDb()
  })

  it('returns 200 for includeFacets even with malformed checklist.system values', async () => {
    const Equipment = require('../models/equipment')

    const inviterRes = await request(app)
      .post('/api/users/register')
      .send({ email: 'equipfacets@example.com', password: 'password123', firstName: 'Equip', lastName: 'Facets', company: 'TestCo' })
    assert.strictEqual(inviterRes.status, 201, `expected 201 from register, got ${inviterRes.status}`)
    const token = inviterRes.body.token
    const user = inviterRes.body.user
    assert(token, 'register should return token')

    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: user._id, name: 'Equipment Facets Project', client: 'Client' })
    assert.strictEqual(projectRes.status, 201, `expected 201 from create project, got ${projectRes.status}`)
    const projectId = projectRes.body._id

    await Equipment.create([
      {
        projectId,
        tag: 'AHU-1',
        title: 'Air Handler 1',
        type: 'AHU',
        system: 'HVAC',
        // mixed/legacy/malformed checklist entries
        checklists: [
          { system: 'Mechanical', sections: [] },
          { system: 5 }, // non-string
          { system: { bad: 'object' } }, // non-string
          { system: null },
          {}, // missing system
          'primitive', // non-object
        ],
        functionalTests: [{ title: 'Test 1' }],
        issues: [],
      },
      {
        projectId,
        tag: 'AHU-2',
        title: 'Air Handler 2',
        type: 'AHU',
        system: 'HVAC',
        checklists: [{ system: 'Controls' }, { system: 'Controls' }],
        functionalTests: [],
        issues: [],
      },
      {
        projectId,
        tag: 'PMP-1',
        title: 'Pump 1',
        type: 'Pump',
        system: 'Hydronic',
        checklists: [],
        functionalTests: [],
        issues: [],
      },
    ])

    const res = await request(app)
      .get('/api/equipment')
      .set('Authorization', `Bearer ${token}`)
      .query({ projectId, page: 1, perPage: 50, includeFacets: true })

    assert.strictEqual(res.status, 200, `expected 200 from equipment list, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(Array.isArray(res.body.items), 'response.items should be an array')
    assert(res.body.items.length >= 3, 'should return at least 3 items')

    const ahu1 = res.body.items.find((e) => e && e.tag === 'AHU-1')
    assert(ahu1, 'should include AHU-1')
    assert(typeof ahu1.checklistsCount === 'number', 'AHU-1 should have checklistsCount')
    assert(Array.isArray(ahu1.checklistsBySystem), 'AHU-1 should have checklistsBySystem array')
    // Only string systems should be counted
    assert(ahu1.checklistsBySystem.some((x) => x && x.system === 'Mechanical' && x.count === 1), 'AHU-1 should count Mechanical system')
    assert(!ahu1.checklistsBySystem.some((x) => x && x.system === '5'), 'AHU-1 should not count non-string systems')
    assert(!ahu1.checklistsBySystem.some((x) => x && x.system === '[object Object]'), 'AHU-1 should not count object systems')
  })
})

