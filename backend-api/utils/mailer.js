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

  // If SMTP credentials are not provided, write invites to a local dev log
  const smtpUser = process.env.SMTP_USER || process.env.MAILTRAP_USER || '';
  const smtpPass = process.env.SMTP_PASS || process.env.MAILTRAP_PASS || '';
  if (!smtpUser || !smtpPass) {
    try {
      const fs = require('fs')
      const path = require('path')
      const outDir = path.join(__dirname, '..', 'tmp')
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
      const file = path.join(outDir, 'emails.log')
      const record = { to, inviterName, projectName, acceptUrl, html, ts: new Date().toISOString() }
      fs.appendFileSync(file, JSON.stringify(record) + '\n')
      console.info('[mailer] SMTP credentials missing; invite written to', file)
      return { accepted: [to], messageId: `local-log-${Date.now()}` }
    } catch (e) {
      console.error('failed to write invite to local log', e)
      // Fall through to attempt send which will likely fail and be caught below
    }
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'no-reply@example.com',
      to,
      subject: `Invitation to join project: ${projectName}`,
      html
    });
    return info;
  } catch (err) {
    // On send failure, persist to local log so invites are not lost in dev
    try {
      const fs = require('fs')
      const path = require('path')
      const outDir = path.join(__dirname, '..', 'tmp')
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
      const file = path.join(outDir, 'emails.log')
      const record = { to, inviterName, projectName, acceptUrl, html, ts: new Date().toISOString(), error: String(err) }
      fs.appendFileSync(file, JSON.stringify(record) + '\n')
      console.error('[mailer] sendMail failed; wrote invite to', file)
    } catch (e) {
      console.error('failed to write invite to local log after send failure', e)
    }
    throw err
  }
}

async function sendResetEmail({ to, name, resetUrl }) {
  if (process.env.NODE_ENV === 'test') {
    try {
      // eslint-disable-next-line global-require
      const mailSpy = require('../tests/mailSpy');
      mailSpy.push({ to, name, resetUrl, ts: new Date().toISOString() });
    } catch (e) {
      global.__sentEmails = global.__sentEmails || [];
      global.__sentEmails.push({ to, name, resetUrl, ts: new Date().toISOString() });
    }
    return { accepted: [to], messageId: 'test-reset-message' };
  }

  const html = `
    <p>Hello ${name || ''},</p>
    <p>We received a request to reset your password. Click the link below to set a new password:</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `;

  const smtpUser = process.env.SMTP_USER || process.env.MAILTRAP_USER || '';
  const smtpPass = process.env.SMTP_PASS || process.env.MAILTRAP_PASS || '';
  if (!smtpUser || !smtpPass) {
    try {
      const fs = require('fs');
      const path = require('path');
      const outDir = path.join(__dirname, '..', 'tmp');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const file = path.join(outDir, 'emails.log');
      const record = { to, name, resetUrl, html, ts: new Date().toISOString() };
      fs.appendFileSync(file, JSON.stringify(record) + '\n');
      console.info('[mailer] SMTP missing; reset email written to', file);
      return { accepted: [to], messageId: `local-log-reset-${Date.now()}` };
    } catch (e) {
      console.error('failed to write reset email to local log', e);
    }
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'no-reply@example.com',
      to,
      subject: 'Reset your password',
      html,
    });
    return info;
  } catch (err) {
    try {
      const fs = require('fs');
      const path = require('path');
      const outDir = path.join(__dirname, '..', 'tmp');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const file = path.join(outDir, 'emails.log');
      const record = { to, name, resetUrl, html, ts: new Date().toISOString(), error: String(err) };
      fs.appendFileSync(file, JSON.stringify(record) + '\n');
      console.error('[mailer] reset sendMail failed; wrote invite to', file);
    } catch (e) {
      console.error('failed to write reset email to local log after send failure', e);
    }
    throw err;
  }
}

module.exports = { sendInviteEmail, sendResetEmail };
