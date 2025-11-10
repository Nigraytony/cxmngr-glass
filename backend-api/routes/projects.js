const express = require('express');
const router = express.Router();
const Project = require('../models/project');
const User = require('../models/user');
const { requireActiveProject } = require('../middleware/subscription');
const { auth } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create a new project
router.post('/', async (req, res) => {
  // console.log('Creating project with data:', req.body);
  try {
    const user = await User.findById(req.body.userId);
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }
    delete req.body.userId;
    delete req.body._id;
    // If the creator requested a price/plan during creation, persist it on the
    // project so later checkout/stripe flows can pick it up.
    const incoming = { ...req.body };

    // Start the trial at project creation time if not explicitly set.
    if (!incoming.trialStartedAt) incoming.trialStartedAt = new Date();

    // Create a new project with the new schema fields
    const project = new Project(incoming);
    await project.save();

    // Add project to user's projects array (store minimally to avoid duplication)
    user.projects.push({ _id: project._id, role: 'admin', default: false });
    await user.save();

    // Add the user to the project's users array with admin role
    project.team.push({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      company: user.contact.company,
      phone: user.contact.phone, // Optional phone number
      role: 'admin', // Default role for the user creating the project
      status: user.status, // Optional status for team members
    });
    await project.save();

    res.status(201).send(project);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Read all projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find();
    res.status(200).send(projects);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Read a single project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).send();
    }
    res.status(200).send(project);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update a project by ID
router.put('/:id', async (req, res) => {
  try {
    // Prevent external updates to immutable fields like trialStartedAt
    if (typeof req.body === 'object' && req.body) {
      delete req.body.trialStartedAt;
    }
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!project) {
      return res.status(404).send();
    }
    res.status(200).send(project);
  } catch (error) {
    res.status(400).send(error);
  }
});

// post route to add user to project (with invitation flow)
const Invitation = require('../models/invitation');
const crypto = require('crypto');
const { sendInviteEmail } = require('../utils/mailer');

router.post('/addUser', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.body.projectId);
    if (!project) {
      return res.status(404).send({ error: 'Project not found' });
    }
    // find user by email if they exist in the database
    const user = await User.findOne({ email: req.body.email });
    // If user exists, add them directly (if not already present)
    if (user) {
      const userExists = project.team.some((u) => u.email === req.body.email);
      if (userExists) return res.status(400).send({ error: 'User is already on the project' });
      project.team.push({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        company: user.contact?.company || req.body.company || '',
        role: req.body.role,
      });
      await project.save();
      // Ensure user.projects includes the project ref (minimal shape)
      const already = (user.projects || []).some((p) => String((p && (p._id || p.id || p))) === String(project._id))
      if (!already) {
        user.projects.push({ _id: project._id, role: req.body.role || 'user', default: false })
        await user.save()
      }
      return res.status(200).send({ message: 'User was added to the project' });
    }

    // user does not exist: create an invitation
    const token = crypto.randomBytes(20).toString('hex');
    const inviterId = req.userId;
    const invite = new Invitation({ email: req.body.email, projectId: project._id, inviterId, token });
    await invite.save();

    // send invite email with accept link
    const acceptUrl = `${process.env.APP_URL || 'http://localhost:5173'}/register?invite=${token}`;
    try {
      await sendInviteEmail({ to: req.body.email, inviterName: req.body.inviterName || 'A colleague', projectName: project.name, acceptUrl });
    } catch (mailErr) {
      console.error('sendInviteEmail error', mailErr);
      // don't fail the entire request if email fails; still persist the invite
    }

    return res.status(200).send({ message: 'Invitation sent', inviteId: invite._id });
  } catch (error) {
    res.status(400).send(error);
  }
});

// Accept invitation: authenticated users can accept an invite token and be added to the project
router.post('/accept-invite', auth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).send({ error: 'token is required' });
    const invite = await Invitation.findOne({ token });
    if (!invite) return res.status(404).send({ error: 'Invite not found' });
    if (invite.accepted) return res.status(400).send({ error: 'Invite already accepted' });

    const project = await Project.findById(invite.projectId);
    if (!project) return res.status(404).send({ error: 'Project not found' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).send({ error: 'User not found' });

    // Add user to project.team if not present
    const already = project.team.some(t => t.email === user.email);
    if (!already) {
      project.team.push({ _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, company: user.contact?.company || '', role: 'user' });
      await project.save();
    }

    // Ensure the project is present in the user's projects (minimal shape)
    const hasProject = (user.projects || []).some((p) => String((p && (p._id || p.id || p))) === String(project._id))
    if (!hasProject) {
      user.projects.push({ _id: project._id, role: 'user', default: false })
      await user.save()
    }

    invite.accepted = true;
    await invite.save();

    return res.status(200).send({ message: 'Invite accepted', projectId: project._id });
  } catch (err) {
    console.error('accept-invite error', err);
    res.status(400).send(err);
  }
});

// Accept invitation by ID (alternative to token-based flow when user logs in later)
router.post('/invitations/:id/accept', auth, async (req, res) => {
  try {
    const inviteId = req.params.id;
    const invite = await Invitation.findById(inviteId);
    if (!invite) return res.status(404).send({ error: 'Invite not found' });
    if (invite.accepted) return res.status(400).send({ error: 'Invite already accepted' });
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).send({ error: 'User not found' });
    // Ensure the invite email matches the logged in user's email (security)
    if (String(user.email).toLowerCase() !== String(invite.email).toLowerCase()) {
      return res.status(403).send({ error: 'Invite email mismatch' });
    }
    const project = await Project.findById(invite.projectId);
    if (!project) return res.status(404).send({ error: 'Project not found' });

    // Add user to project if not present
    const already = project.team.some(t => t.email === user.email);
    if (!already) {
      project.team.push({ _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, company: user.contact?.company || '', role: 'user' });
      await project.save();
    }
    const hasProject = (user.projects || []).some(p => String((p && (p._id || p.id || p))) === String(project._id));
    if (!hasProject) {
      user.projects.push({ _id: project._id, role: 'user', default: false });
      await user.save();
    }
    invite.accepted = true;
    await invite.save();
    return res.status(200).send({ message: 'Invite accepted', projectId: project._id });
  } catch (err) {
    console.error('accept invite by id error', err);
    return res.status(400).send({ error: 'Failed to accept invite' });
  }
});

// List invites for a project
router.get('/:id/invites', auth, async (req, res) => {
  try {
    const invites = await Invitation.find({ projectId: req.params.id }).lean();
    return res.status(200).send(invites);
  } catch (err) {
    console.error('list-invites error', err);
    return res.status(500).send({ error: 'Failed to list invites' });
  }
});

// Resend an invitation email
router.post('/:id/resend-invite', auth, async (req, res) => {
  try {
    const { inviteId } = req.body;
    if (!inviteId) return res.status(400).send({ error: 'inviteId is required' });
    const invite = await Invitation.findById(inviteId);
    if (!invite) return res.status(404).send({ error: 'Invite not found' });
    if (String(invite.projectId) !== String(req.params.id)) return res.status(400).send({ error: 'Invite does not belong to project' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).send({ error: 'Project not found' });

    const acceptUrl = `${process.env.APP_URL || 'http://localhost:5173'}/register?invite=${invite.token}`;
    try {
      await sendInviteEmail({ to: invite.email, inviterName: 'A colleague', projectName: project.name, acceptUrl });
    } catch (mailErr) {
      console.error('resendInvite email error', mailErr);
      return res.status(500).send({ error: 'Failed to send invite email' });
    }

    // update createdAt to now
    invite.createdAt = new Date();
    await invite.save();

    return res.status(200).send({ message: 'Invitation resent' });
  } catch (err) {
    console.error('resend-invite error', err);
    return res.status(500).send({ error: 'Failed to resend invite' });
  }
});

// List my pending invitations (for logged-in user by email)
router.get('/my-invites', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).send({ error: 'User not found' });
    // Match email case-insensitively to avoid issues with casing on invites
    const emailRegex = new RegExp(`^${String(user.email).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    const invites = await Invitation.find({ email: { $regex: emailRegex }, accepted: false })
      .sort({ createdAt: -1 })
      .lean();
    // Attach minimal project details to improve UX
    const projectIds = [...new Set(invites.map(i => String(i.projectId)))];
    const projects = await Project.find({ _id: { $in: projectIds } }).select('_id name logo').lean();
    const projMap = Object.fromEntries(projects.map(p => [String(p._id), p]));
    const result = invites.map(i => ({
      id: String(i._id),
      email: i.email,
      token: i.token,
      createdAt: i.createdAt,
      project: projMap[String(i.projectId)] || { _id: i.projectId },
    }));
    return res.status(200).send(result);
  } catch (err) {
    console.error('my-invites error', err);
    return res.status(500).send({ error: 'Failed to list invitations' });
  }
});

// Set a project as default for a user
router.post('/:id/set-default', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { userId } = req.body;
    if (!userId) return res.status(400).send({ error: 'userId is required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).send({ error: 'User not found' });

    // Ensure user.projects entries that reference this projectId are updated
    const oldProjects = (user.projects || [])
    user.projects = oldProjects.map((p) => {
      const pid = String(typeof p === 'string' ? p : (p && (p._id || p.id)))
      const isDefault = (pid === String(projectId))
      const role = (typeof p === 'object' && p && p.role) ? p.role : 'user'
      return { _id: pid, role, default: isDefault }
    })

    await user.save();

    // sanitize user object before returning
    const userObj = user.toObject ? user.toObject() : JSON.parse(JSON.stringify(user));
    if (userObj.password) delete userObj.password;
    // avoid returning internal fields
    if (userObj.__v) delete userObj.__v;

    // Hydrate user.projects with live project data so UI has names immediately
    try {
      const projIds = Array.isArray(userObj.projects)
        ? userObj.projects.map((p) => String(typeof p === 'string' ? p : (p && (p._id || p.id)))).filter(Boolean)
        : []
      if (projIds.length) {
        const unique = Array.from(new Set(projIds))
        const found = await Project.find({ _id: { $in: unique } }).lean()
        const map = {}
        for (const pr of found) map[String(pr._id)] = pr
        userObj.projects = userObj.projects.map((p) => {
          const pid = String(typeof p === 'string' ? p : (p && (p._id || p.id)))
          const role = (typeof p === 'object' && p && p.role) ? p.role : 'user'
          const isDefault = Boolean(typeof p === 'object' && p && p.default)
          const pr = map[pid] || null
          return {
            _id: pid,
            name: pr ? pr.name : undefined,
            client: pr ? pr.client : undefined,
            location: pr ? pr.location : undefined,
            project_type: pr ? pr.project_type : undefined,
            status: pr ? pr.status : undefined,
            description: pr ? pr.description : undefined,
            role,
            default: isDefault,
          }
        })
      }
    } catch (e) {
      // fallback: leave minimal shape
    }

    return res.status(200).send({ user: userObj });
  } catch (error) {
    return res.status(400).send(error);
  }
});

// Change plan (update the price on the existing Stripe subscription item)
// Preserves trial_end when subscription is in trialing state, so trial does not reset.
// const { auth } = require('../middleware/auth');
router.post('/:id/change-plan', auth, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { priceId, proration_behavior } = req.body || {};
    if (!priceId) return res.status(400).json({ error: 'priceId is required' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.stripeSubscriptionId) return res.status(400).json({ error: 'Project does not have an active subscription' });

    // Retrieve subscription
    const sub = await stripe.subscriptions.retrieve(String(project.stripeSubscriptionId));
    const currentItem = sub.items && sub.items.data && sub.items.data[0];
    if (!currentItem) return res.status(400).json({ error: 'Subscription has no items to update' });

    const updateParams = {
      items: [{ id: currentItem.id, price: priceId }],
      // Default to Stripe's prorations unless explicitly disabled by client
      proration_behavior: proration_behavior || 'create_prorations',
    };
    // If still in trial, explicitly preserve the original trial_end so it cannot be extended/reset
    if (sub.status === 'trialing' && sub.trial_end) {
      updateParams.trial_end = sub.trial_end;
    }

    const updated = await stripe.subscriptions.update(sub.id, updateParams);

    // Mirror to DB (do not extend trialEnd – keep existing or the earlier of the two)
    let nextTrialEnd = project.trialEnd || null;
    const incomingTrialEnd = updated.trial_end ? new Date(updated.trial_end * 1000) : null;
    if (incomingTrialEnd) {
      nextTrialEnd = nextTrialEnd ? new Date(Math.min(nextTrialEnd.getTime(), incomingTrialEnd.getTime())) : incomingTrialEnd;
    }

    await Project.findByIdAndUpdate(projectId, {
      stripeSubscriptionId: updated.id,
      stripePriceId: priceId,
      stripeSubscriptionStatus: updated.status,
      stripeCurrentPeriodEnd: updated.current_period_end ? new Date(updated.current_period_end * 1000) : null,
      isActive: ['active', 'trialing', 'past_due'].includes(updated.status),
      trialEnd: nextTrialEnd || project.trialEnd || null,
      trialStarted: project.trialStarted || Boolean(updated.trial_end),
    });

    return res.json({ ok: true, status: updated.status, priceId });
  } catch (err) {
    console.error('change-plan error', err && err.message ? err.message : err);
    if (err && err.raw && err.raw.message) return res.status(400).json({ error: err.raw.message });
    return res.status(500).json({ error: 'Failed to change plan' });
  }
});

// Delete a project by ID
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).send();
    }
    res.status(200).send(project);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Project logs: append and read
// GET /api/projects/:id/logs?limit=200&type=section_created
router.get('/:id/logs', auth, async (req, res) => {
  try {
    const id = req.params.id
    const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 200))
    const type = req.query.type ? String(req.query.type) : null
    const project = await Project.findById(id).select('logs').lean()
    if (!project) return res.status(404).send({ error: 'Project not found' })
    let logs = Array.isArray(project.logs) ? project.logs.slice() : []
    if (type) logs = logs.filter((e) => e && e.type === type)
    // Sort by ts descending; if missing ts, push to end
    logs.sort((a, b) => {
      const ta = a && a.ts ? new Date(a.ts).getTime() : 0
      const tb = b && b.ts ? new Date(b.ts).getTime() : 0
      return tb - ta
    })
    logs = logs.slice(0, limit)
    return res.status(200).send(logs)
  } catch (err) {
    console.error('get project logs error', err)
    return res.status(500).send({ error: 'Failed to load logs' })
  }
})

// POST /api/projects/:id/logs -> append one log event
router.post('/:id/logs', auth, async (req, res) => {
  try {
    const id = req.params.id
    const event = (typeof req.body === 'object' && req.body) ? { ...req.body } : {}
    if (!event.type) return res.status(400).send({ error: 'type is required' })
    // Normalize fields
    event.ts = event.ts ? new Date(event.ts) : new Date()
    // Best-effort: if by not set, try to populate from auth user
    if (!event.by && req.userId) {
      try {
        const u = await require('../models/user').findById(req.userId).lean()
        if (u) event.by = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || String(u._id)
      } catch {}
    }
    // Cap total size to last 5000 entries
    const updated = await Project.findByIdAndUpdate(
      id,
      { $push: { logs: { $each: [event], $slice: -5000 } }, $set: { updatedAt: new Date() } },
      { new: true, projection: { _id: 1 } }
    )
    if (!updated) return res.status(404).send({ error: 'Project not found' })
    return res.status(201).send({ ok: true })
  } catch (err) {
    console.error('append project log error', err)
    return res.status(500).send({ error: 'Failed to append log' })
  }
})

// Example protected route that performs a sensitive action and requires an active subscription
router.post('/:id/do-sensitive', requireActiveProject, async (req, res) => {
  try {
    // This is an example. Replace with a real sensitive action such as creating premium issues
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).send({ error: 'Project not found' });

    // perform the sensitive action - here we just return a success message
    return res.status(200).send({ message: 'Sensitive action allowed: subscription active', projectId: project._id });
  } catch (err) {
    return res.status(500).send({ error: err.message || String(err) });
  }
});

// Allow an authenticated user to leave a project. This is atomic on the server:
// - removes the user from the project's team
// - removes the project reference from the user's projects array
// - prevents the last admin from leaving (requires ownership transfer or project delete)
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.userId || (req.user && req.user._id);
    if (!userId) return res.status(401).send({ error: 'Please authenticate.' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).send({ error: 'Project not found' });

    // Find the team member entry for this user
  const member = project.team.find((t) => String(t._id) === String(userId) || String(t.email).toLowerCase() === String(req.user.email).toLowerCase());
    if (!member) return res.status(400).send({ error: 'You are not a member of this project' });

    // If member is an admin, ensure they're not the last admin
    const adminCount = project.team.reduce((acc, t) => acc + (t.role === 'admin' ? 1 : 0), 0);
    if (member.role === 'admin' && adminCount <= 1) {
      return res.status(400).send({ error: 'Cannot leave project as the last admin. Transfer admin role or delete the project first.' });
    }

    // Remove member from project.team
    project.team = project.team.filter((t) => !(String(t._id) === String(userId) || String(t.email).toLowerCase() === String(req.user.email).toLowerCase()));
    await project.save();

    // Remove project reference from user.projects
    const user = await User.findById(userId);
    if (user) {
      user.projects = (user.projects || []).filter((p) => String(typeof p === 'string' ? p : (p && (p._id || p.id))) !== String(projectId));
      await user.save();
    }

    return res.status(200).send({ message: 'Left project successfully', projectId });
  } catch (err) {
    console.error('leave-project error', err);
    return res.status(500).send({ error: 'Failed to leave project' });
  }
});

module.exports = router;