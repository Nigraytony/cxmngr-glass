// Run this script to test invite email delivery without starting the full server.
// Usage: from repo root run: `node backend-api/utils/test-send-invite.js`
// It will load backend-api/.env via dotenv so ensure your SMTP_* vars are set there.

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const { sendInviteEmail } = require('./mailer')

async function run() {
  try {
    const to = process.env.TEST_INVITE_TO || 'test@example.com'
    const inviterName = 'Dev Tester'
    const projectName = 'Test Project'
    const acceptUrl = (process.env.APP_URL || 'http://localhost:5173') + '/register?invite=test-token'
    console.log('Sending invite to', to)
    const info = await sendInviteEmail({ to, inviterName, projectName, acceptUrl })
    console.log('sendInviteEmail result:', info)
  } catch (err) {
    console.error('sendInviteEmail error:', err)
    process.exitCode = 1
  }
}

run()
