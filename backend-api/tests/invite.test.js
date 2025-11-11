const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const mongoose = require('mongoose');
const assert = require('assert');

// Ensure test mode so mailer is short-circuited
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
const mailSpy = require('./mailSpy');

describe('Invite flow integration', function () {
  this.timeout(30000);
  let mongod;
  let app;

  before(async () => {
    // reset mail spy before test run
    mailSpy.reset();
  // Use a replica set-backed in-memory server so transactions are supported
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = mongod.getUri();
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    // Ensure mailer doesn't fail the transaction in tests; it's caught by the route.
    process.env.SMTP_HOST = process.env.SMTP_HOST || 'localhost';
    process.env.SMTP_PORT = process.env.SMTP_PORT || '2525';

    // Require the app after env is configured so DB connects to the in-memory server
    app = require('../index.js');

    // Wait for mongoose to connect (connectMongo in index.js attempts connection)
    const deadline = Date.now() + 10000;
    while (mongoose.connection.readyState !== 1 && Date.now() < deadline) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 100));
    }
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Failed to connect to in-memory mongo');
    }
  });

  after(async () => {
    try { await mongoose.disconnect(); } catch (e) {}
    try { await mongod.stop(); } catch (e) {}
  });

  beforeEach(() => {
    // reset mailSpy between test cases
    mailSpy.reset();
  });

  it('creates an invite for a non-existing user and allows acceptance after registration', async () => {
    // 1) Register inviter
    const inviterRes = await request(app)
      .post('/api/users/register')
      .send({ email: 'inviter@example.com', password: 'password123', firstName: 'Inv', lastName: 'Iter', company: 'TestCo' });
    if (inviterRes.status !== 201) {
      console.error('inviter register failed:', inviterRes.status, inviterRes.body);
    }
    assert(inviterRes.status === 201, `expected 201 from register, got ${inviterRes.status}`);
    const inviterToken = inviterRes.body.token;
    const inviterUser = inviterRes.body.user;
    assert(inviterToken, 'inviter should receive a token');

    // 2) Create a project using inviter's userId
    const projectRes = await request(app)
      .post('/api/projects')
      .send({ userId: inviterUser._id, name: 'Test Project', client: 'TestClient' });
    if (projectRes.status !== 201) console.error('create project failed:', projectRes.status, projectRes.body);
    assert(projectRes.status === 201, `expected 201 from create project, got ${projectRes.status}`);
    const project = projectRes.body;

    // 3) Invite a new user (who does not yet exist)
    const inviteRes = await request(app)
      .post('/api/projects/addUser')
      .set('Authorization', `Bearer ${inviterToken}`)
      .send({ projectId: project._id, email: 'invitee@example.com', role: 'user', inviterName: 'Inviter' });
  if (inviteRes.status !== 200) throw new Error('addUser failed: ' + JSON.stringify(inviteRes.body));
  if (!(inviteRes.body.message === 'Invitation sent' || inviteRes.body.message === 'OK' || inviteRes.body.message === 'Invitation sent')) throw new Error('expected invitation to be sent; got: ' + JSON.stringify(inviteRes.body));
  // Assert that an invite email payload was produced via mailSpy
  const sentEmail = mailSpy.last();
  if (!sentEmail) throw new Error('expected sendInviteEmail to be called during addUser');
  assert.strictEqual(sentEmail.to, 'invitee@example.com', 'email should be addressed to invitee');
  assert.strictEqual(sentEmail.projectName, project.name, 'email should include the project name');
  assert(sentEmail.inviterName === 'Inviter' || typeof sentEmail.inviterName === 'string', 'inviterName should be present');
  assert(sentEmail.acceptUrl && sentEmail.acceptUrl.includes('/register?invite='), 'acceptUrl should contain invite token');
    const invitesList = await request(app)
      .get(`/api/projects/${project._id}/invites`)
      .set('Authorization', `Bearer ${inviterToken}`);
    if (invitesList.status !== 200) throw new Error('list invites failed: ' + JSON.stringify(invitesList.body));
    assert(Array.isArray(invitesList.body), 'invites list should be an array');
    assert(invitesList.body.length >= 1, 'should have at least one invite');
    const inviteObj = invitesList.body[0];

    // 4) Register the invitee
    const invitee = await request(app)
      .post('/api/users/register')
      .send({ email: 'invitee@example.com', password: 'password123', firstName: 'Invitee', lastName: 'Person', company: 'TestCo' });
    if (invitee.status !== 201) throw new Error('invitee register failed: ' + JSON.stringify(invitee.body));
    const inviteeToken = invitee.body.token;
    const inviteeUser = invitee.body.user;
    assert(inviteeToken, 'invitee should receive a token');

    // 5) Verify the invite appears in the invitee's "my-invites" list
    const myInvites = await request(app)
      .get('/api/projects/my-invites')
      .set('Authorization', `Bearer ${inviteeToken}`);
    if (myInvites.status !== 200) throw new Error('my-invites failed: ' + JSON.stringify(myInvites.body));
    assert(Array.isArray(myInvites.body), 'my-invites should return an array');
    const foundInvite = myInvites.body.find((i) => i.token === inviteObj.token || String(i.project._id) === String(project._id));
    assert(foundInvite, 'invite should be present in my-invites for the registered invitee');

    // 6) Accept the invite by token as the authenticated invitee
    const acceptRes = await request(app)
      .post('/api/projects/accept-invite')
      .set('Authorization', `Bearer ${inviteeToken}`)
      .send({ token: inviteObj.token });
    if (acceptRes.status !== 200) throw new Error('accept-invite failed: ' + JSON.stringify(acceptRes.body));
    assert(acceptRes.body.message && acceptRes.body.message.toLowerCase().includes('invite accepted'), 'expected invite accepted response');

    // 7) Verify the project now contains the invitee
    const projectAfter = await request(app)
      .get(`/api/projects/${project._id}`);
    if (projectAfter.status !== 200) throw new Error('get project after accept failed: ' + JSON.stringify(projectAfter.body));
    const team = projectAfter.body.team || [];
    const found = team.find((t) => String(t.email).toLowerCase() === 'invitee@example.com');
    assert(found, 'project team should include the invitee after acceptance');

    // 7) Verify the invitee's /me shows the project in their projects array
    const me = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${inviteeToken}`)
      .expect(200);
    const userProjects = (me.body.user && me.body.user.projects) || [];
    const hasProject = userProjects.some((p) => String(p._id) === String(project._id));
    assert(hasProject, 'invitee user should have the project in their projects list');
  });

  it('rejects acceptance by id when invite email does not match the authenticated user', async () => {
    // inviter
    const inviter = await request(app)
      .post('/api/users/register')
      .send({ email: 'inviter2@example.com', password: 'password123', firstName: 'Inv2', lastName: 'Iter', company: 'TestCo' });
    assert(inviter.status === 201);
    const inviterToken = inviter.body.token;
    const inviterUser = inviter.body.user;

    // project
    const projectRes = await request(app)
      .post('/api/projects')
      .send({ userId: inviterUser._id, name: 'ProjMismatch', client: 'TestClient' });
    assert(projectRes.status === 201);
    const project = projectRes.body;

    // invite someone to 'target@example.com'
    const inviteRes = await request(app)
      .post('/api/projects/addUser')
      .set('Authorization', `Bearer ${inviterToken}`)
      .send({ projectId: project._id, email: 'target@example.com', role: 'user', inviterName: 'Inviter2' });
    assert(inviteRes.status === 200);
    const invitesList = await request(app)
      .get(`/api/projects/${project._id}/invites`)
      .set('Authorization', `Bearer ${inviterToken}`);
    assert(invitesList.status === 200 && invitesList.body.length >= 1);
    const inviteObj = invitesList.body[0];

    // register a different user
    const other = await request(app)
      .post('/api/users/register')
      .send({ email: 'otheruser@example.com', password: 'password123', firstName: 'Other', lastName: 'User', company: 'TestCo' });
    assert(other.status === 201);
    const otherToken = other.body.token;

    // attempt to accept by id as the wrong user -> should be 403
    const inviteId = inviteObj.id || inviteObj._id || inviteObj;
    const accept = await request(app)
      .post(`/api/projects/invitations/${inviteId}/accept`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send();
    assert(accept.status === 403, `expected 403 for email mismatch, got ${accept.status} ${JSON.stringify(accept.body)}`);
    assert(accept.body && accept.body.error && accept.body.error.toLowerCase().includes('invite email mismatch'));
  });

  it('rejects accepting an already accepted invite', async () => {
    // inviter
    const inviter = await request(app)
      .post('/api/users/register')
      .send({ email: 'inviter3@example.com', password: 'password123', firstName: 'Inv3', lastName: 'Iter', company: 'TestCo' });
    assert(inviter.status === 201);
    const inviterToken = inviter.body.token;
    const inviterUser = inviter.body.user;

    // project
    const projectRes = await request(app)
      .post('/api/projects')
      .send({ userId: inviterUser._id, name: 'ProjDuplicate', client: 'TestClient' });
    assert(projectRes.status === 201);
    const project = projectRes.body;

    // invite
    const inviteRes = await request(app)
      .post('/api/projects/addUser')
      .set('Authorization', `Bearer ${inviterToken}`)
      .send({ projectId: project._id, email: 'dup@example.com', role: 'user', inviterName: 'Inviter3' });
    assert(inviteRes.status === 200);
    const invitesList = await request(app)
      .get(`/api/projects/${project._id}/invites`)
      .set('Authorization', `Bearer ${inviterToken}`);
    assert(invitesList.status === 200 && invitesList.body.length >= 1);
    const inviteObj = invitesList.body[0];

    // register the invitee
    const invitee = await request(app)
      .post('/api/users/register')
      .send({ email: 'dup@example.com', password: 'password123', firstName: 'Dup', lastName: 'User', company: 'TestCo' });
    assert(invitee.status === 201);
    const inviteeToken = invitee.body.token;

    // accept once (by token)
    const accept1 = await request(app)
      .post('/api/projects/accept-invite')
      .set('Authorization', `Bearer ${inviteeToken}`)
      .send({ token: inviteObj.token });
    assert(accept1.status === 200);

    // accept again -> should be 400 (already accepted)
    const accept2 = await request(app)
      .post('/api/projects/accept-invite')
      .set('Authorization', `Bearer ${inviteeToken}`)
      .send({ token: inviteObj.token });
    assert(accept2.status === 400 || accept2.status === 409, `expected 400/409 for already accepted, got ${accept2.status}`);
    assert(accept2.body && accept2.body.error && (accept2.body.error.toLowerCase().includes('already accepted') || accept2.body.error.toLowerCase().includes('accepted')));
  });

  it('returns 404 for invalid invite token on accept-invite', async () => {
    // register a user
    const user = await request(app)
      .post('/api/users/register')
      .send({ email: 'someuser@example.com', password: 'password123', firstName: 'Some', lastName: 'User', company: 'TestCo' });
    assert(user.status === 201);
    const token = user.body.token;

    // attempt to accept with an invalid token
    const res = await request(app)
      .post('/api/projects/accept-invite')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: 'this-token-does-not-exist' });
    assert(res.status === 404, `expected 404 for missing invite token, got ${res.status}`);
    assert(res.body && res.body.error && res.body.error.toLowerCase().includes('invite not found'));
  });

  it('matches invites case-insensitively (invite created with mixed-case email)', async () => {
    // inviter
    const inviter = await request(app)
      .post('/api/users/register')
      .send({ email: 'inviter-case@example.com', password: 'password123', firstName: 'InvCase', lastName: 'Iter', company: 'TestCo' });
    assert(inviter.status === 201);
    const inviterToken = inviter.body.token;
    const inviterUser = inviter.body.user;

    // project
    const projectRes = await request(app)
      .post('/api/projects')
      .send({ userId: inviterUser._id, name: 'ProjCase', client: 'TestClient' });
    assert(projectRes.status === 201);
    const project = projectRes.body;

    // invite with mixed-case email
    const mixedEmail = 'InviteMixed@Example.COM';
    const inviteRes = await request(app)
      .post('/api/projects/addUser')
      .set('Authorization', `Bearer ${inviterToken}`)
      .send({ projectId: project._id, email: mixedEmail, role: 'user', inviterName: 'InvCase' });
    assert(inviteRes.status === 200);

    // register invitee with lowercase email
    const invitee = await request(app)
      .post('/api/users/register')
      .send({ email: 'invitemixed@example.com', password: 'password123', firstName: 'Case', lastName: 'Invite', company: 'TestCo' });
    assert(invitee.status === 201);
    const inviteeToken = invitee.body.token;

    // my-invites should include the invitation even though case differs
    const myInvites = await request(app)
      .get('/api/projects/my-invites')
      .set('Authorization', `Bearer ${inviteeToken}`);
    assert(myInvites.status === 200);
    const found = myInvites.body.find(i => String(i.project._id) === String(project._id));
    assert(found, 'expected to find invite in my-invites despite case differences');
  });

  // Additional normalization tests for user emails
  it('stores user emails lowercased when registering via API', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ email: 'NormTest@Example.COM', password: 'password123', firstName: 'Norm', lastName: 'Test', company: 'TestCo' });
    assert(res.status === 201);
    const User = require('../models/user');
    const u = await User.findOne({ _id: res.body.user._id }).lean();
    assert(u && u.email === 'normtest@example.com', 'expected stored email to be lowercased')
  });

  it('normalizes email when updating user model directly', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ email: 'UpdateTest@Example.COM', password: 'password123', firstName: 'Upd', lastName: 'Test', company: 'TestCo' });
    assert(res.status === 201);
    const User = require('../models/user');
    const u = await User.findById(res.body.user._id);
    u.email = 'ChangedCase@Example.COM';
    await u.save();
    const reloaded = await User.findById(u._id).lean();
    assert(reloaded && reloaded.email === 'changedcase@example.com', 'expected email normalization on update')
  });

  // RBAC integration tests appended here to reuse the same in-memory replica set
  it('permits a user with a role that has the permission', async () => {
    const Role = require('../models/role');
    // create a role with the test permission
    await Role.create({ name: 'tester', permissions: ['rbac.test'] });

    // create a user with default role via register, then set the role directly in DB
    const reg = await request(app)
      .post('/api/users/register')
      .send({ email: 'rbac-user@example.com', password: 'password123', firstName: 'RBAC', lastName: 'User', company: 'TestCo' });
    assert(reg.status === 201, `register failed: ${reg.status} ${JSON.stringify(reg.body)}`);
    const User = require('../models/user');
    // Directly update underlying collection to set a custom role value that is not part of the enum
    await mongoose.connection.db.collection('users').updateOne({ _id: new mongoose.Types.ObjectId(reg.body.user._id) }, { $set: { role: 'tester' } });
    // perform a login (or reuse returned token) — register returned a token for the original role, but role is stored on the DB now
    const token = reg.body.token;

    const res = await request(app)
      .get('/api/rbac/check')
      .set('Authorization', `Bearer ${token}`);
    assert(res.status === 200, `expected 200 for permitted user, got ${res.status}`);
    assert(res.body && res.body.ok === true, 'expected ok:true');
  });

  it('rejects a user whose role does not include the permission', async () => {
    const Role = require('../models/role');
    await Role.create({ name: 'nope', permissions: [] });

    const reg = await request(app)
      .post('/api/users/register')
      .send({ email: 'rbac-nope@example.com', password: 'password123', firstName: 'No', lastName: 'Perm', company: 'TestCo' });
    assert(reg.status === 201);
    await mongoose.connection.db.collection('users').updateOne({ _id: new mongoose.Types.ObjectId(reg.body.user._id) }, { $set: { role: 'nope' } });
    const token = reg.body.token;

    const res = await request(app)
      .get('/api/rbac/check')
      .set('Authorization', `Bearer ${token}`);
    assert(res.status === 403, `expected 403 for forbidden user, got ${res.status}`);
  });
});
