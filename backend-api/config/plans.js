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
      documents: false,
      activities: false,
      tasks: false,
      ai: false,
    },
    limits: {
      team: 10,
      issues: 250,
      equipment: 100,
      spaces: 0,
      templates: 0,
      activities: 0,
      tasks: 0,
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
      templates: false,
      documents: false,
      activities: true,
      tasks: false,
      ai: false,
    },
    limits: {
      team: 25,
      issues: 1000,
      equipment: 500,
      spaces: 1000,
      templates: 0,
      activities: 500,
      tasks: 0,
    },
    summary: 'Full platform access (except Tasks) with higher limits.',
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
      documents: true,
      activities: true,
      tasks: true,
      ai: true,
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
