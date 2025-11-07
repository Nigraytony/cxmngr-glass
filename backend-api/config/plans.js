// Server-side canonical plan definitions (map plan keys to Stripe price IDs)
module.exports = [
  {
    key: 'basic',
    label: 'Basic Plan – $29/mo',
    priceId: 'price_1MwoMXHUb4cunvDgueGxHOji',
    summary: 'Essential features for individuals or small teams getting started.',
    features: [
      'Activities, issues, and photo uploads',
      'PDF report generation',
      'Email support'
    ]
  },
  {
    key: 'standard',
    label: 'Standard Plan – $49/mo',
    priceId: 'price_1MwoOMHUb4cunvDgtbBKXDrN',
    summary: 'Adds productivity and collaboration enhancements for growing teams.',
    features: [
      'Everything in Basic',
      'Team collaboration tools',
      'Priority email support'
    ]
  },
  {
    key: 'premium',
    label: 'Premium Plan – $79/mo',
    priceId: 'price_1MwoRJHUb4cunvDgehwhilRg',
    summary: 'Best for larger teams that want the full suite and fastest support.',
    features: [
      'Everything in Standard',
      'Advanced workflows',
      'Priority support'
    ]
  },
];
