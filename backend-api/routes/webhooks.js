const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Project = require('../models/project');
const User = require('../models/user');

router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const subscriptionId = session.subscription;
        const metadata = session.metadata || {};
        const projectId = metadata.projectId;
        const userId = metadata.userId;

        if (subscriptionId && projectId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await Project.findByIdAndUpdate(projectId, {
            stripeSubscriptionId: subscriptionId,
            stripePriceId: sub.items.data[0].price.id,
            stripeSubscriptionStatus: sub.status,
            stripeCurrentPeriodEnd: new Date(sub.current_period_end * 1000),
            stripeCancelAtPeriodEnd: sub.cancel_at_period_end || false
          });
        }
        if (userId && session.customer) {
          await User.findByIdAndUpdate(userId, { stripeCustomerId: session.customer });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const projectId = subscription.metadata && subscription.metadata.projectId;
        if (projectId) {
          await Project.findByIdAndUpdate(projectId, {
            stripeSubscriptionStatus: subscription.status,
            stripeCurrentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
            stripeCancelAtPeriodEnd: subscription.cancel_at_period_end || false
          });
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (subscriptionId) {
          const project = await Project.findOne({ stripeSubscriptionId: subscriptionId });
          if (project) {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            project.stripeSubscriptionStatus = sub.status;
            project.stripeCurrentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
            await project.save();
          }
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (subscriptionId) {
          const project = await Project.findOne({ stripeSubscriptionId: subscriptionId });
          if (project) {
            project.stripeSubscriptionStatus = 'past_due';
            await project.save();
          }
        }
        break;
      }
      default:
        // ignore other events
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error', err);
    res.status(500).send('Webhook handler error');
  }
});

module.exports = router;
