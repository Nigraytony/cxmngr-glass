const request = require('supertest')
const mongoose = require('mongoose')
const assert = require('assert')
const { clearDb, withCsrf } = require('./testUtils')

process.env.NODE_ENV = process.env.NODE_ENV || 'test'

describe('Action items (Activity report redesign Stage 2)', function () {
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
    const projectId = String(projectRes.body._id)

    const actRes = await withCsrf(request(app)
      .post('/api/activities'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, name: 'Cx Meeting/Site Visit - 3', type: 'Site Visit Review' })
    assert.strictEqual(actRes.status, 201)
    const activityId = String(actRes.body._id || actRes.body.id)
    return { token, projectId, activityId }
  }

  it('lifecycle: create assigns A-n sequence, list sorts, patch, delete', async () => {
    const { token, projectId, activityId } = await bootstrap({ email: 'ai1@example.com' })

    const first = await withCsrf(request(app).post('/api/action-items'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, activityId, description: 'Repair chiller insulation per Spec 236416', owner: 'BoldAir / Trane', due: 'Before startup' })
    assert.strictEqual(first.status, 201)
    assert.strictEqual(first.body.sequence, 1)
    assert.strictEqual(first.body.status, 'Open')

    const second = await withCsrf(request(app).post('/api/action-items'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, activityId, description: 'Anchor CH-1 and CH-2 to housekeeping pads', owner: 'BoldAir' })
    assert.strictEqual(second.status, 201)
    assert.strictEqual(second.body.sequence, 2)

    const list = await request(app)
      .get(`/api/action-items?activityId=${activityId}&projectId=${projectId}`)
      .set('Authorization', `Bearer ${token}`)
    assert.strictEqual(list.status, 200)
    assert.strictEqual(list.body.length, 2)
    assert.strictEqual(list.body[0].sequence, 1)

    const patched = await withCsrf(request(app).patch(`/api/action-items/${first.body._id}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Complete', due: 'Done 07/10' })
    assert.strictEqual(patched.status, 200)
    assert.strictEqual(patched.body.status, 'Complete')
    assert.strictEqual(patched.body.sequence, 1) // sequence is immutable via patch

    const del = await withCsrf(request(app).delete(`/api/action-items/${second.body._id}`))
      .set('Authorization', `Bearer ${token}`)
    assert.strictEqual(del.status, 200)

    const after = await request(app)
      .get(`/api/action-items?activityId=${activityId}`)
      .set('Authorization', `Bearer ${token}`)
    assert.strictEqual(after.body.length, 1)
  })

  it('rejects an activity that does not belong to the project', async () => {
    const { token, projectId } = await bootstrap({ email: 'ai2@example.com' })
    const other = await bootstrap({ email: 'ai2b@example.com' })
    const res = await withCsrf(request(app).post('/api/action-items'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, activityId: other.activityId, description: 'X' })
    assert.ok([400, 403, 404].includes(res.status))
  })

  it('validates linked issues belong to the project', async () => {
    const { token, projectId, activityId } = await bootstrap({ email: 'ai3@example.com' })
    const bogus = new mongoose.Types.ObjectId().toString()
    const res = await withCsrf(request(app).post('/api/action-items'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, activityId, description: 'X', issueIds: [bogus] })
    assert.strictEqual(res.status, 400)
  })

  it('requires a recommendation on checklist-origin issues', async () => {
    const { token, projectId } = await bootstrap({ email: 'ai4@example.com' })
    const noRec = await withCsrf(request(app).post('/api/issues'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title: 'Suction gauge missing', description: 'No suction gauge installed', origin: 'checklist' })
    assert.strictEqual(noRec.status, 400)

    const withRec = await withCsrf(request(app).post('/api/issues'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title: 'Suction gauge missing', description: 'No suction gauge installed', origin: 'checklist', recommendation: 'Install gauge matching discharge range' })
    assert.strictEqual(withRec.status, 201)
    assert.strictEqual(withRec.body.origin, 'checklist')
  })
})
