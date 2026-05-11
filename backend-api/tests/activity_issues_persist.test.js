const request = require('supertest')
const mongoose = require('mongoose')
const assert = require('assert')
const { clearDb, withCsrf } = require('./testUtils')

process.env.NODE_ENV = process.env.NODE_ENV || 'test'

describe('Activity issues persistence integration', function () {
  this.timeout(30000)
  let app

  before(async () => {
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
    if (mongoose.connection.readyState !== 1) throw new Error('Failed to connect to mongo')
    await clearDb()
  })

  after(async () => {
    try { await mongoose.disconnect() } catch (e) {}
  })

  beforeEach(async () => {
    await clearDb()
  })

  it('persists linked issues on activity and reload', async () => {
    const ownerRes = await withCsrf(request(app).post('/api/users/register'))
      .send({ email: 'owner-activity@example.com', password: 'password123', firstName: 'Own', lastName: 'Er', company: 'TestCo' })
    assert.strictEqual(ownerRes.status, 201)
    const token = ownerRes.body.accessToken
    assert(token, 'expected owner token')

    const projectRes = await withCsrf(request(app).post('/api/projects'))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Activity Project', client: 'Client' })
    assert.strictEqual(projectRes.status, 201)
    const projectId = String(projectRes.body._id)

    const actRes = await withCsrf(request(app).post('/api/activities'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, name: 'Site Visit', type: 'Site Visit Review' })
    assert.strictEqual(actRes.status, 201)
    const activityId = String(actRes.body._id || actRes.body.id)
    assert(activityId, 'expected activity id')

    const issueRes = await withCsrf(request(app).post('/api/issues'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title: 'Issue A', description: 'Desc', type: 'Activity' })
    assert.strictEqual(issueRes.status, 201)
    const issueId = String(issueRes.body._id || issueRes.body.id)
    assert(issueId, 'expected issue id')

    const patchRes = await withCsrf(request(app).patch(`/api/activities/${activityId}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ issues: [issueId] })
    assert.strictEqual(patchRes.status, 200)
    const patchedIssues = Array.isArray(patchRes.body.issues) ? patchRes.body.issues.map(String) : []
    assert(patchedIssues.includes(issueId), 'expected patched activity to include issue id')

    const getRes = await request(app)
      .get(`/api/activities/${activityId}`)
      .set('Authorization', `Bearer ${token}`)
    assert.strictEqual(getRes.status, 200)
    const reloadedIssues = Array.isArray(getRes.body.issues) ? getRes.body.issues.map(String) : []
    assert(reloadedIssues.includes(issueId), 'expected reloaded activity to include issue id')

    const unlinkRes = await withCsrf(request(app).patch(`/api/activities/${activityId}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ issues: [] })
    assert.strictEqual(unlinkRes.status, 200)
    const afterUnlink = Array.isArray(unlinkRes.body.issues) ? unlinkRes.body.issues.map(String) : []
    assert.strictEqual(afterUnlink.length, 0)
  })

  it('rejects linking issues from another project', async () => {
    const ownerRes = await withCsrf(request(app).post('/api/users/register'))
      .send({ email: 'owner-activity2@example.com', password: 'password123', firstName: 'Own', lastName: 'Er', company: 'TestCo' })
    assert.strictEqual(ownerRes.status, 201)
    const token = ownerRes.body.accessToken

    const projectARes = await withCsrf(request(app).post('/api/projects'))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Project A', client: 'Client' })
    assert.strictEqual(projectARes.status, 201)
    const projectAId = String(projectARes.body._id)

    const projectBRes = await withCsrf(request(app).post('/api/projects'))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Project B', client: 'Client' })
    assert.strictEqual(projectBRes.status, 201)
    const projectBId = String(projectBRes.body._id)

    const actRes = await withCsrf(request(app).post('/api/activities'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId: projectAId, name: 'A Activity', type: 'Site Visit Review' })
    assert.strictEqual(actRes.status, 201)
    const activityId = String(actRes.body._id || actRes.body.id)

    const issueRes = await withCsrf(request(app).post('/api/issues'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId: projectBId, title: 'Issue B', description: 'Desc', type: 'Activity' })
    assert.strictEqual(issueRes.status, 201)
    const issueId = String(issueRes.body._id || issueRes.body.id)

    const patchRes = await withCsrf(request(app).patch(`/api/activities/${activityId}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ issues: [issueId] })
    assert.strictEqual(patchRes.status, 400)
    assert.strictEqual(String(patchRes.body.error || '').includes('invalid for this project'), true)
  })

  it('silently drops legacy orphan issue refs from a different project on save', async () => {
    const ownerRes = await withCsrf(request(app).post('/api/users/register'))
      .send({ email: 'owner-activity3@example.com', password: 'password123', firstName: 'Own', lastName: 'Er', company: 'TestCo' })
    assert.strictEqual(ownerRes.status, 201)
    const token = ownerRes.body.accessToken

    const projectARes = await withCsrf(request(app).post('/api/projects'))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Project A', client: 'Client' })
    assert.strictEqual(projectARes.status, 201)
    const projectAId = String(projectARes.body._id)

    const projectBRes = await withCsrf(request(app).post('/api/projects'))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Project B', client: 'Client' })
    assert.strictEqual(projectBRes.status, 201)
    const projectBId = String(projectBRes.body._id)

    const actRes = await withCsrf(request(app).post('/api/activities'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId: projectAId, name: 'A Activity', type: 'Site Visit Review' })
    assert.strictEqual(actRes.status, 201)
    const activityId = String(actRes.body._id || actRes.body.id)

    // Valid same-project issue we will keep
    const validIssueRes = await withCsrf(request(app).post('/api/issues'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId: projectAId, title: 'Valid', description: 'Desc', type: 'Activity' })
    assert.strictEqual(validIssueRes.status, 201)
    const validId = String(validIssueRes.body._id || validIssueRes.body.id)

    // Cross-project orphan — created in Project B but we'll seed it onto the
    // Project A activity directly, simulating legacy pre-validation data.
    const orphanIssueRes = await withCsrf(request(app).post('/api/issues'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId: projectBId, title: 'Orphan', description: 'Desc', type: 'Activity' })
    assert.strictEqual(orphanIssueRes.status, 201)
    const orphanId = String(orphanIssueRes.body._id || orphanIssueRes.body.id)

    // Direct DB write to bypass current validation and simulate legacy state.
    const Activity = mongoose.model('Activity')
    await Activity.updateOne({ _id: activityId }, { $set: { issues: [orphanId] } })

    // A new valid same-project issue we want to add.
    const newIssueRes = await withCsrf(request(app).post('/api/issues'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId: projectAId, title: 'New', description: 'Desc', type: 'Activity' })
    assert.strictEqual(newIssueRes.status, 201)
    const newId = String(newIssueRes.body._id || newIssueRes.body.id)

    // Client behavior: re-sends the full existing list (including orphan) plus the new id.
    const patchRes = await withCsrf(request(app).patch(`/api/activities/${activityId}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ issues: [orphanId, validId, newId] })
    assert.strictEqual(patchRes.status, 200)
    const saved = Array.isArray(patchRes.body.issues) ? patchRes.body.issues.map(String) : []
    assert.strictEqual(saved.includes(orphanId), false, 'orphan should be dropped')
    assert.strictEqual(saved.includes(newId), true, 'new valid issue should be linked')
    // validId was never previously on the activity, so it's an "added" id — it must be project-valid (it is) and kept.
    assert.strictEqual(saved.includes(validId), true, 'same-project added issue should be kept')
  })
})
