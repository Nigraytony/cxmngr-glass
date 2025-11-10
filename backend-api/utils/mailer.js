const nodemailer = require('nodemailer');

// create transporter from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
  auth: {
    user: process.env.SMTP_USER || process.env.MAILTRAP_USER || '',
    pass: process.env.SMTP_PASS || process.env.MAILTRAP_PASS || ''
  }
});

async function sendInviteEmail({ to, inviterName, projectName, acceptUrl }) {
  // During tests we don't want to attempt real SMTP connections; short-circuit.
  if (process.env.NODE_ENV === 'test') {
    // Record payload via a test helper so tests can assert on it without making network calls
    try {
      // require the test spy dynamically to avoid load-time dependency when not testing
      // path is relative to backend-api/utils
      // eslint-disable-next-line global-require
      const mailSpy = require('../tests/mailSpy');
      mailSpy.push({ to, inviterName, projectName, acceptUrl, ts: new Date().toISOString() });
    } catch (e) {
      // If the spy cannot be required, fall back to global (legacy)
      global.__sentEmails = global.__sentEmails || [];
      global.__sentEmails.push({ to, inviterName, projectName, acceptUrl, ts: new Date().toISOString() });
    }
    // mimic nodemailer's info object minimally
    return { accepted: [to], messageId: 'test-message-id' };
  }
  const html = `
    <p>Hello,</p>
    <p>${inviterName} has invited you to join the project <strong>${projectName}</strong>.</p>
    <p><a href="${acceptUrl}">Click here to accept the invitation and register</a>.</p>
    <p>If you already have an account, log in first and then visit the link to accept the invite.</p>
  `;

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@example.com',
    to,
    subject: `Invitation to join project: ${projectName}`,
    html
  });
  return info;
}

module.exports = { sendInviteEmail };
