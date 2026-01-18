const request = require('supertest')
const mongoose = require('mongoose')
const assert = require('assert')
const { clearDb } = require('./testUtils')

process.env.NODE_ENV = process.env.NODE_ENV || 'test'

describe('OPR workshop integration', function () {
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

  it('runs a minimal open→vote→finalize flow', async () => {
    const Project = require('../models/project')

    const ownerRes = await request(app)
      .post('/api/users/register')
      .send({ email: 'owner-opr@example.com', password: 'password123', firstName: 'Own', lastName: 'Er', company: 'TestCo' })
    assert.strictEqual(ownerRes.status, 201)
    const token = ownerRes.body.token
    assert(token, 'expected owner token')

    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'OPR Project', client: 'Client' })
    assert.strictEqual(projectRes.status, 201)
    const projectId = String(projectRes.body._id)

    await Project.findByIdAndUpdate(projectId, { $set: { 'addons.oprWorkshop.enabled': true } })

    const catRes = await request(app)
      .get(`/api/projects/${projectId}/opr/categories`)
      .set('Authorization', `Bearer ${token}`)
    assert.strictEqual(catRes.status, 200)
    assert(Array.isArray(catRes.body) && catRes.body.length > 0, 'expected seeded categories')
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

    const listAns = await request(app)
      .get(`/api/projects/${projectId}/opr/questions/${questionId}/answers`)
      .set('Authorization', `Bearer ${token}`)
    assert.strictEqual(listAns.status, 200)
    assert.strictEqual(listAns.body.length, 5)

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

    const resultsRes = await request(app)
      .get(`/api/projects/${projectId}/opr/questions/${questionId}/results`)
      .set('Authorization', `Bearer ${token}`)
    assert.strictEqual(resultsRes.status, 200)
    assert(Array.isArray(resultsRes.body.results) && resultsRes.body.results.length === 5, 'expected ranked results')
    assert.strictEqual(resultsRes.body.results[0].score, 5)
    assert.strictEqual(resultsRes.body.results[0].rank, 1)
  })
})

