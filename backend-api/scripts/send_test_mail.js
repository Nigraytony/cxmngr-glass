require('dotenv').config()
const { sendInviteEmail, sendResetEmail } = require('../utils/mailer')

async function main() {
  const to = process.argv[2] || process.env.TEST_MAIL_TO
  if (!to) {
    console.error('Usage: node scripts/send_test_mail.js <recipient@example.com>')
    process.exit(1)
  }
  const from = process.env.MAIL_FROM || 'no-reply@example.com'
  console.log('[test-mail] Using MAIL_FROM:', from)
  try {
    const info = await sendInviteEmail({ to, inviterName: 'System', projectName: 'CXMngr', acceptUrl: 'https://example.com/accept' })
    console.log('[test-mail] Invite sent:', info)
  } catch (e) {
    console.error('[test-mail] Invite failed:', e)
  }
  try {
      const info2 = await sendResetEmail({ to, name: 'User', resetUrl: 'https://example.com/reset', expiresMinutes: 60 })
    console.log('[test-mail] Reset sent:', info2)
  } catch (e) {
    console.error('[test-mail] Reset failed:', e)
  }
}
main()
