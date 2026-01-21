const request = require('supertest')
const mongoose = require('mongoose')
const assert = require('assert')
const { clearDb } = require('./testUtils')

process.env.NODE_ENV = process.env.NODE_ENV || 'test'

describe('OPR item linking (issues + functional tests)', function () {
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

  async function bootstrapProject({ email }) {
    const Project = require('../models/project')

    const reg = await request(app)
      .post('/api/users/register')
      .send({ email, password: 'password123', firstName: 'Test', lastName: 'User', company: 'TestCo' })
    assert.strictEqual(reg.status, 201)
    const token = reg.body.token

    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Project ${email}`, client: 'Client' })
    assert.strictEqual(projectRes.status, 201)
    const projectId = String(projectRes.body._id)

    await Project.findByIdAndUpdate(projectId, { $set: { 'addons.oprWorkshop.enabled': true } })

    return { token, projectId }
  }

  async function createOprItems({ token, projectId }) {
    const catRes = await request(app)
      .get(`/api/projects/${projectId}/opr/categories`)
      .set('Authorization', `Bearer ${token}`)
    assert.strictEqual(catRes.status, 200)
    const categoryId = String(catRes.body[0].id)

    const qRes = await request(app)
      .post(`/api/projects/${projectId}/opr/questions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId, prompt: 'What matters most to you?' })
    assert.strictEqual(qRes.status, 201)
    const questionId = String(qRes.body.id)

    const openRes = await request(app)
      .post(`/api/projects/${projectId}/opr/questions/${questionId}/open`)
      .set('Authorization', `Bearer ${token}`)
      .send({ durationMinutes: 10 })
    assert.strictEqual(openRes.status, 200)

    const answerIds = []
    for (let i = 1; i <= 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const aRes = await request(app)
        .post(`/api/projects/${projectId}/opr/questions/${questionId}/answers`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: `Answer ${i}` })
      assert.strictEqual(aRes.status, 201)
      answerIds.push(String(aRes.body.id))
    }

    const closeRes = await request(app)
      .post(`/api/projects/${projectId}/opr/questions/${questionId}/close`)
      .set('Authorization', `Bearer ${token}`)
    assert.strictEqual(closeRes.status, 200)

    const openVote = await request(app)
      .post(`/api/projects/${projectId}/opr/questions/${questionId}/open-voting`)
      .set('Authorization', `Bearer ${token}`)
      .send({ durationMinutes: 10 })
    assert.strictEqual(openVote.status, 200)

    const joinRes = await request(app)
      .post(`/api/projects/${projectId}/opr/questions/${questionId}/join`)
      .set('Authorization', `Bearer ${token}`)
    assert.strictEqual(joinRes.status, 200)

    const rankings = answerIds.map((id, idx) => ({ answerId: id, rank: idx + 1 }))
    const voteRes = await request(app)
      .post(`/api/projects/${projectId}/opr/questions/${questionId}/votes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rankings })
    assert.strictEqual(voteRes.status, 200)

    const finalizeRes = await request(app)
      .post(`/api/projects/${projectId}/opr/questions/${questionId}/close-voting`)
      .set('Authorization', `Bearer ${token}`)
    assert.strictEqual(finalizeRes.status, 200)

    const itemsRes = await request(app)
      .get(`/api/projects/${projectId}/opr/items?categoryId=${categoryId}`)
      .set('Authorization', `Bearer ${token}`)
    assert.strictEqual(itemsRes.status, 200)
    assert(Array.isArray(itemsRes.body) && itemsRes.body.length > 0, 'expected OPR items after close-voting')
    return { categoryId, item: itemsRes.body[0] }
  }

  it('allows linking active OPR items to an issue and functional test', async () => {
    const { token, projectId } = await bootstrapProject({ email: 'opr-links-owner@example.com' })
    const { item } = await createOprItems({ token, projectId })
    const oprItemId = String(item.id)

    // Create an issue with oprItemIds
    const issueRes = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title: 'Issue with OPR', description: 'desc', oprItemIds: [oprItemId] })
    assert.strictEqual(issueRes.status, 201)
    assert(Array.isArray(issueRes.body.oprItemIds) && String(issueRes.body.oprItemIds[0]) === oprItemId)

    // Create equipment and patch functionalTests with oprItemIds
    const eqRes = await request(app)
      .post('/api/equipment')
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, tag: 'AHU-1', name: 'AHU-1', system: 'HVAC', status: 'Not Started' })
    assert.strictEqual(eqRes.status, 201)
    const equipmentId = String(eqRes.body._id)

    const patchRes = await request(app)
      .patch(`/api/equipment/${equipmentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        functionalTests: [
          { number: 1, name: 'Test 1', pass: null, oprItemIds: [oprItemId] },
        ],
      })
    assert.strictEqual(patchRes.status, 200)
    assert(Array.isArray(patchRes.body.functionalTests))
    assert(Array.isArray(patchRes.body.functionalTests[0].oprItemIds))
    assert.strictEqual(String(patchRes.body.functionalTests[0].oprItemIds[0]), oprItemId)
  })

  it('rejects linking OPR items from another project', async () => {
    const a = await bootstrapProject({ email: 'opr-links-a@example.com' })
    const b = await bootstrapProject({ email: 'opr-links-b@example.com' })

    const { item: itemB } = await createOprItems({ token: b.token, projectId: b.projectId })
    const foreignOprItemId = String(itemB.id)

    const issueRes = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ projectId: a.projectId, title: 'Issue invalid OPR', description: 'desc', oprItemIds: [foreignOprItemId] })
    assert.strictEqual(issueRes.status, 400)
    assert(String(issueRes.body.error || '').includes('oprItemIds'))

    const eqRes = await request(app)
      .post('/api/equipment')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ projectId: a.projectId, tag: 'AHU-2', name: 'AHU-2', system: 'HVAC', status: 'Not Started' })
    assert.strictEqual(eqRes.status, 201)
    const equipmentId = String(eqRes.body._id)

    const patchRes = await request(app)
      .patch(`/api/equipment/${equipmentId}`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({
        functionalTests: [
          { number: 1, name: 'Test 1', pass: null, oprItemIds: [foreignOprItemId] },
        ],
      })
    assert.strictEqual(patchRes.status, 400)
    assert(String(patchRes.body.error || '').includes('oprItemIds'))
  })
})

