// Central plan definitions for feature gating and UI.
// priceId values can be wired to Stripe price IDs via env vars.
const priceBasic = process.env.STRIPE_PRICE_BASIC || 'price_basic'
const priceStandard = process.env.STRIPE_PRICE_STANDARD || 'price_standard'
const pricePremium = process.env.STRIPE_PRICE_PREMIUM || 'price_premium'

module.exports = [
  {
    key: 'basic',
    name: 'Basic',
    label: 'Basic — $29/mo',
    priceId: priceBasic,
    features: {
      issues: true,
      equipment: true,
      spaces: false,
      templates: false,
      activities: false,
      tasks: false,
    },
    limits: {
      team: 10,
      issues: 250,
      equipment: 100,
      spaces: 100,
      templates: 50,
      activities: 50,
      tasks: 200,
    },
    summary: 'Core access with limited Issues/Equipment and small team.',
  },
  {
    key: 'standard',
    name: 'Standard',
    label: 'Standard — $49/mo',
    priceId: priceStandard,
    features: {
      issues: true,
      equipment: true,
      spaces: true,
      templates: true,
      activities: true,
      tasks: true,
    },
    limits: {
      team: 20,
      issues: 1000,
      equipment: 500,
      spaces: 500,
      templates: 200,
      activities: 500,
      tasks: 1000,
    },
    summary: 'Full platform access with higher limits.',
  },
  {
    key: 'premium',
    name: 'Premium',
    label: 'Premium — $79/mo',
    priceId: pricePremium,
    features: {
      issues: true,
      equipment: true,
      spaces: true,
      templates: true,
      activities: true,
      tasks: true,
    },
    limits: {
      team: 200,
      issues: 100000,
      equipment: 100000,
      spaces: 100000,
      templates: 100000,
      activities: 100000,
      tasks: 100000,
    },
    summary: 'Unlimited projects with the most generous limits.',
  },
]
