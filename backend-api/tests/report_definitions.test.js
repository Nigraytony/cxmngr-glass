const request = require('supertest')
const mongoose = require('mongoose')
const assert = require('assert')
const { clearDb, withCsrf } = require('./testUtils')

process.env.NODE_ENV = process.env.NODE_ENV || 'test'

describe('Report definitions (project-shared saved reports)', function () {
  this.timeout(30000)
  let app

  before(async () => {
    if (!process.env.MONGODB_URI || !String(process.env.MONGODB_URI).startsWith('mongodb')) {
      process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test'
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'

    try { delete require.cache[require.resolve('../index')] } catch (e) { /* ignore */ }
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
    try { await mongoose.disconnect() } catch (e) { /* ignore */ }
  })

  beforeEach(async () => {
    await clearDb()
  })

  async function bootstrap({ email }) {
    const reg = await withCsrf(request(app)
      .post('/api/users/register'))
      .send({ email, password: 'password123', firstName: 'Test', lastName: 'User', company: 'TestCo' })
    assert.strictEqual(reg.status, 201)
    const token = reg.body.accessToken

    const projectRes = await withCsrf(request(app)
      .post('/api/projects'))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Project ${email}`, client: 'Client' })
    assert.strictEqual(projectRes.status, 201)
    return { token, projectId: String(projectRes.body._id) }
  }

  it('full lifecycle: create, list, update, delete', async () => {
    const { token, projectId } = await bootstrap({ email: 'rd1@example.com' })
    const base = `/api/projects/${projectId}/report-definitions`

    const created = await withCsrf(request(app).post(base))
      .set('Authorization', `Bearer ${token}`)
      .send({ entity: 'issues', name: 'Open issues by system', definition: { columns: ['number', 'title', 'system'], sort: { key: 'system', dir: 'asc' } } })
    assert.strictEqual(created.status, 201)
    assert.strictEqual(created.body.entity, 'issues')
    const id = String(created.body._id)

    const list = await request(app).get(`${base}?entity=issues`).set('Authorization', `Bearer ${token}`)
    assert.strictEqual(list.status, 200)
    assert.strictEqual(list.body.items.length, 1)
    assert.strictEqual(list.body.items[0].name, 'Open issues by system')

    const updated = await withCsrf(request(app).patch(`${base}/${id}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Open issues', definition: { columns: ['number', 'title'] } })
    assert.strictEqual(updated.status, 200)
    assert.strictEqual(updated.body.name, 'Open issues')
    assert.deepStrictEqual(updated.body.definition.columns, ['number', 'title'])

    const del = await withCsrf(request(app).delete(`${base}/${id}`))
      .set('Authorization', `Bearer ${token}`)
    assert.strictEqual(del.status, 200)

    const after = await request(app).get(base).set('Authorization', `Bearer ${token}`)
    assert.strictEqual(after.body.items.length, 0)
  })

  it('rejects duplicate names per module and unknown entities', async () => {
    const { token, projectId } = await bootstrap({ email: 'rd2@example.com' })
    const base = `/api/projects/${projectId}/report-definitions`

    const first = await withCsrf(request(app).post(base))
      .set('Authorization', `Bearer ${token}`)
      .send({ entity: 'equipment', name: 'Weekly list', definition: {} })
    assert.strictEqual(first.status, 201)

    const dup = await withCsrf(request(app).post(base))
      .set('Authorization', `Bearer ${token}`)
      .send({ entity: 'equipment', name: 'Weekly list', definition: {} })
    assert.strictEqual(dup.status, 409)

    const badEntity = await withCsrf(request(app).post(base))
      .set('Authorization', `Bearer ${token}`)
      .send({ entity: 'nonsense', name: 'X', definition: {} })
    assert.strictEqual(badEntity.status, 400)
  })

  it('denies non-members of the project', async () => {
    const owner = await bootstrap({ email: 'rd3-owner@example.com' })
    const outsider = await bootstrap({ email: 'rd3-outsider@example.com' })
    const base = `/api/projects/${owner.projectId}/report-definitions`

    const denedList = await request(app).get(base).set('Authorization', `Bearer ${outsider.token}`)
    assert.strictEqual(denedList.status, 403)

    const deniedCreate = await withCsrf(request(app).post(base))
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ entity: 'issues', name: 'Nope', definition: {} })
    assert.strictEqual(deniedCreate.status, 403)
  })
})
