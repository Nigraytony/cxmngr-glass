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
