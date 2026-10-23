const request = require('supertest')
const mongoose = require('mongoose')
const assert = require('assert')
const { clearDb, withCsrf } = require('./testUtils')

process.env.NODE_ENV = process.env.NODE_ENV || 'test'

describe('Issue verification & Step 2 fields (Issue report redesign)', function () {
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
    const reg = await withCsrf(request(app).post('/api/users/register'))
      .send({ email, password: 'password123', firstName: 'Test', lastName: 'User', company: 'TestCo' })
    assert.strictEqual(reg.status, 201)
    const token = reg.body.accessToken
    const projectRes = await withCsrf(request(app).post('/api/projects'))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Project ${email}`, client: 'Client' })
    assert.strictEqual(projectRes.status, 201)
    return { token, projectId: String(projectRes.body._id) }
  }

  async function createIssue(token, projectId, extra = {}) {
    const res = await withCsrf(request(app).post('/api/issues'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title: 'RMS not operational', description: 'Not yet operable', ...extra })
    assert.strictEqual(res.status, 201)
    return res.body
  }

  it('defaults the life-safety flag on for Critical issues (editable)', async () => {
    const { token, projectId } = await bootstrap({ email: 'iv1@example.com' })
    const critical = await createIssue(token, projectId, { severity: 'Critical' })
    assert.strictEqual(critical.lifeSafety, true)
    const medium = await createIssue(token, projectId, { severity: 'Medium' })
    assert.strictEqual(!!medium.lifeSafety, false)
    const criticalOff = await createIssue(token, projectId, { severity: 'Critical', lifeSafety: false })
    assert.strictEqual(criticalOff.lifeSafety, false)
  })

  it('refuses to close an issue without a verification outcome', async () => {
    const { token, projectId } = await bootstrap({ email: 'iv2@example.com' })
    const issue = await createIssue(token, projectId)
    const res = await withCsrf(request(app).patch(`/api/issues/${issue._id}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Closed' })
    assert.strictEqual(res.status, 400)
    assert.match(String(res.body.error || ''), /verification outcome/i)
  })

  it('a closing verification outcome closes the issue and stamps metadata', async () => {
    const { token, projectId } = await bootstrap({ email: 'iv3@example.com' })
    const issue = await createIssue(token, projectId)
    const res = await withCsrf(request(app).patch(`/api/issues/${issue._id}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ verification: { outcome: 'verified_closed', verifiedBy: 'Nigel Gray', notes: 'Back-checked on site' } })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.status, 'Closed')
    assert.strictEqual(res.body.verification.outcome, 'verified_closed')
    assert.ok(res.body.closedDate)
    assert.strictEqual(res.body.closedBy, 'Nigel Gray')
  })

  it('not_resolved outcome records verification without closing', async () => {
    const { token, projectId } = await bootstrap({ email: 'iv4@example.com' })
    const issue = await createIssue(token, projectId)
    const res = await withCsrf(request(app).patch(`/api/issues/${issue._id}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ verification: { outcome: 'not_resolved', verifiedBy: 'Nigel Gray' } })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.status, 'Open')
    assert.strictEqual(res.body.verification.outcome, 'not_resolved')
    assert.ok(!res.body.closedDate)
  })

  it('round-trips the response block and strips HTML from the new fields', async () => {
    const { token, projectId } = await bootstrap({ email: 'iv5@example.com' })
    const issue = await createIssue(token, projectId)
    const res = await withCsrf(request(app).patch(`/api/issues/${issue._id}`))
      .set('Authorization', `Bearer ${token}`)
      .send({
        response: { correctiveAction: '<b>Sensors relocated</b> and panel started', completedDate: '2026-10-25', respondedBy: 'Randy Frost (BoldAir)' },
        reference: 'Spec <i>236416</i> · ASHRAE 15',
        lifeSafety: true,
        lifeSafetyNote: 'Chillers running with <script>no</script> leak detection',
      })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.response.correctiveAction, 'Sensors relocated and panel started')
    assert.strictEqual(res.body.reference, 'Spec 236416 · ASHRAE 15')
    assert.ok(!res.body.lifeSafetyNote.includes('<'))
  })

  it('validates equipment links belong to the project', async () => {
    const { token, projectId } = await bootstrap({ email: 'iv6@example.com' })
    const issue = await createIssue(token, projectId)
    const bogus = new mongoose.Types.ObjectId().toString()
    const res = await withCsrf(request(app).patch(`/api/issues/${issue._id}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ equipmentIds: [bogus] })
    assert.strictEqual(res.status, 400)
  })

  it('persists project reportSettings (short names + distribution)', async () => {
    const { token, projectId } = await bootstrap({ email: 'iv7@example.com' })
    const res = await withCsrf(request(app).put(`/api/projects/${projectId}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ reportSettings: { companyShortNames: { 'Energy Management Consulting, LLC.': 'EMCx' }, issueDistribution: [{ name: 'Mike Christy', company: 'GDC' }] } })
    assert.ok([200, 201].includes(res.status))
    const got = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
    assert.strictEqual(got.status, 200)
    assert.strictEqual(got.body.reportSettings.companyShortNames['Energy Management Consulting, LLC.'], 'EMCx')
  })
})
