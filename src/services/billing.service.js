// EkPost SaaS Billing & Subscription Service
export const SAAS_PLANS = [
  {
    id: 'plan_free',
    name: 'Free Starter',
    priceINR: 0,
    priceUSD: 0,
    maxAccounts: 3,
    maxPostsPerMonth: 15,
    features: [
      '3 Connected Social Accounts',
      '15 Scheduled Posts / Month',
      'Basic Social Previews',
      'Standard Support'
    ]
  },
  {
    id: 'plan_creator_pro',
    name: 'Creator Pro',
    badge: 'Most Popular 🔥',
    priceINR: 799,
    priceUSD: 9,
    maxAccounts: 10,
    maxPostsPerMonth: 999999, // Unlimited
    features: [
      '10 Connected Accounts',
      'Unlimited Scheduling',
      'AI Caption & Hashtag Generator',
      'Full Analytics Dashboard',
      'Priority Support'
    ]
  },
  {
    id: 'plan_agency',
    name: 'Agency & Teams',
    priceINR: 2499,
    priceUSD: 29,
    maxAccounts: 35,
    maxPostsPerMonth: 999999,
    features: [
      '35 Connected Social Profiles',
      'Team Collaboration (3 Seats)',
      'Custom Branding & White-labeling',
      'Automated CSV Bulk Scheduling',
      'Dedicated Account Manager'
    ]
  }
];

export class BillingService {
  static getPlans() {
    return SAAS_PLANS;
  }

  /**
   * Create Checkout Session for Razorpay or Stripe
   */
  static async createCheckoutSession({ planId, customerEmail, gateway = 'razorpay' }) {
    const plan = SAAS_PLANS.find(p => p.id === planId);
    if (!plan) {
      throw new Error('Invalid plan selected.');
    }

    if (plan.priceINR === 0) {
      return {
        success: true,
        isFree: true,
        message: 'You are now on the Free Starter plan!'
      };
    }

    // Mock order creation for demonstration / test mode
    const orderId = `order_${Date.now()}`;
    return {
      success: true,
      isFree: false,
      gateway,
      orderId,
      amount: plan.priceINR * 100, // in paise
      currency: 'INR',
      planName: plan.name,
      customerEmail: customerEmail || 'user@example.com',
      keyId: 'rzp_test_mock_key_123'
    };
  }
}
