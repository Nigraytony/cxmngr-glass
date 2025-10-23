const express = require('express');
const router = express.Router();
const Project = require('../models/project');
const User = require('../models/user');
const { requireActiveProject } = require('../middleware/subscription');

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

    // Add project to user's projects array (use name, not title)
    user.projects.push({
      _id: project._id,
      name: project.name,
      client: project.client,
      role: 'admin',
      location: project.location,
      project_type: project.project_type,
      status: project.status,
      description: project.description,
      default: false
    });
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
const { auth } = require('../middleware/auth');

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

    invite.accepted = true;
    await invite.save();

    return res.status(200).send({ message: 'Invite accepted', projectId: project._id });
  } catch (err) {
    console.error('accept-invite error', err);
    res.status(400).send(err);
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
    const newProjects = []
    for (const p of oldProjects) {
      // If entry is a string id, try to look up project metadata and preserve fields
      if (typeof p === 'string') {
        const pid = p
        const full = await Project.findById(pid).lean().catch(() => null)
        const isDefault = String(pid) === String(projectId)
        const obj = {
          _id: pid,
          name: full?.name,
          client: full?.client,
          role: full?.role || undefined,
          location: full?.location,
          project_type: full?.project_type,
          status: full?.status,
          description: full?.description,
          default: isDefault
        }
        newProjects.push(obj)
      } else if (typeof p === 'object') {
        // preserve existing fields on object entries
        const pid = p._id || p.id
        const isDefault = String(pid) === String(projectId)
        newProjects.push({ ...p, default: isDefault })
      } else {
        // unexpected type - convert to object with id if possible
        newProjects.push({ _id: p, default: String(p) === String(projectId) })
      }
    }

    user.projects = newProjects;

    await user.save();

    // sanitize user object before returning
    const userObj = user.toObject ? user.toObject() : JSON.parse(JSON.stringify(user));
    if (userObj.password) delete userObj.password;
    // avoid returning internal fields
    if (userObj.__v) delete userObj.__v;

    return res.status(200).send({ user: userObj });
  } catch (error) {
    return res.status(400).send(error);
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

module.exports = router;