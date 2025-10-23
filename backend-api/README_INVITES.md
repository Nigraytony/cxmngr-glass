Invite/emailing setup

Environment variables required for emails:

- SMTP_HOST - SMTP host (e.g., smtp.mailtrap.io for testing)
- SMTP_PORT - SMTP port (e.g., 587)
- SMTP_USER - SMTP username
- SMTP_PASS - SMTP password
- MAIL_FROM - From address for outgoing emails (optional)
- APP_URL - Public app URL for constructing accept links (default http://localhost:5173)

What was added:

- models/invitation.js - Mongoose model for invitations
- utils/mailer.js - Nodemailer-based helper to send invite emails
- routes/projects.js - when adding a user who doesn't exist, an Invitation is created and email is sent; added `/api/projects/accept-invite` POST route to accept invites after auth.

How it works:

1. Admin calls POST /api/projects/addUser with projectId, email, firstName, lastName, role. If the user doesn't exist, an Invitation is created and an email sent with a link: `${APP_URL}/register?invite=${token}`.
2. The invited user visits the link, registers. On successful registration/login, the frontend will call POST /api/projects/accept-invite with the token which will add the user to the project's team.

Note: This is a minimal implementation for dev/testing. In production you should:
- Use signed tokens with expiry
- Rate-limit invite creation
- Add better email templates and clickable CTA
- Show proper UI feedback for invites
