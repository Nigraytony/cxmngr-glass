const request = require('supertest');
const mongoose = require('mongoose');
const assert = require('assert');
const { clearDb } = require('./testUtils');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

describe('AI chat safety rails', function () {
  this.timeout(30000);
  let app;
  let Project;

  before(async () => {
    if (!process.env.MONGODB_URI || !String(process.env.MONGODB_URI).startsWith('mongodb')) {
      process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test';
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';

    // Ensure a fresh app instance so connectMongo() runs after previous tests disconnected
    try { delete require.cache[require.resolve('../index')]; } catch (e) {}
    app = require('../index.js');
    Project = require('../models/project');

    const deadline = Date.now() + 10000;
    while (mongoose.connection.readyState !== 1 && Date.now() < deadline) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 100));
    }
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Failed to connect to mongo');
    }
    await clearDb();
  });

  after(async () => {
    try { await mongoose.disconnect(); } catch (e) {}
  });

  beforeEach(async () => {
    await clearDb();
  });

  async function setupProjectWithAiEnabled() {
    const userRes = await request(app)
      .post('/api/users/register')
      .send({ email: 'owner@example.com', password: 'password123', firstName: 'Owner', lastName: 'User', company: 'TestCo' });
    assert(userRes.status === 201, `expected 201 from register, got ${userRes.status}`);
    const token = userRes.body.token;
    const user = userRes.body.user;

    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: user._id, name: 'AI Project', client: 'Client' });
    assert(projectRes.status === 201, `expected 201 from create project, got ${projectRes.status}`);
    const project = projectRes.body;

    await Project.findByIdAndUpdate(project._id, {
      $set: {
        isActive: true,
        subscriptionTier: 'premium',
        'ai.enabled': true,
        'ai.provider': 'openai',
        'ai.hasKey': false,
      },
    });

    return { token, projectId: project._id };
  }

  it('refuses billing/subscription change requests without calling a provider', async () => {
    const { token, projectId } = await setupProjectWithAiEnabled();
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId,
        messages: [{ role: 'user', content: 'Please downgrade my subscription and refund the last invoice.' }],
      });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(String(res.body.message || '').toLowerCase().includes('billing') || String(res.body.message || '').toLowerCase().includes('subscription'));
  });

  it('refuses destructive delete requests with a confirmation-style response', async () => {
    const { token, projectId } = await setupProjectWithAiEnabled();
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId,
        messages: [{ role: 'user', content: 'Delete all tasks in this project and wipe the database.' }],
      });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(String(res.body.message || '').toLowerCase().includes('destructive'));
  });
});
