const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Project = require('../models/project');
const User = require('../models/user');
const { auth } = require('../middleware/auth');

// Create Checkout Session for subscribing a project
router.post('/create-checkout-session', auth, async (req, res) => {
  const { priceId, projectId } = req.body;
  const user = req.user;

  if (!priceId || !projectId) return res.status(400).json({ error: 'priceId and projectId required' });

  try {
    // Ensure stripe customer exists
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user._id.toString() }
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { projectId: projectId, userId: user._id.toString() }
      },
      success_url: `${process.env.APP_URL || 'http://localhost:5173'}/projects/edit/${projectId}?sub_success=1`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:5173'}/projects/edit/${projectId}?sub_cancel=1`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session error', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create Billing Portal Session
router.post('/create-portal-session', auth, async (req, res) => {
  const { returnUrl } = req.body;
  const user = req.user;
  if (!user.stripeCustomerId) return res.status(400).json({ error: 'No Stripe customer for user' });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl || process.env.APP_URL || 'http://localhost:5173'
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('create-portal-session err', err);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

module.exports = router;
