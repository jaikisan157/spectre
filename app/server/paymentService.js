/**
 * Stripe Payment Service for ShadowChat
 * 
 * Handles premium subscriptions and unban payments.
 * Uses Stripe Checkout for secure payment processing.
 * 
 * Setup:
 * 1. Create a Stripe account at https://stripe.com
 * 2. Get your test API keys from the Stripe Dashboard
 * 3. Add them to server/.env:
 *    STRIPE_SECRET_KEY=sk_test_...
 *    STRIPE_WEBHOOK_SECRET=whsec_...
 */

const PREMIUM_PRICE_CENTS = 499;    // $4.99/month
const UNBAN_PRICE_CENTS = 999;      // $9.99 one-time

export class PaymentService {
  constructor(stripeSecretKey, authService) {
    this.authService = authService;
    this.stripe = null;
    this.isConfigured = false;

    if (stripeSecretKey && stripeSecretKey !== 'sk_test_YOUR_KEY_HERE') {
      import('stripe').then(({ default: Stripe }) => {
        this.stripe = new Stripe(stripeSecretKey);
        this.isConfigured = true;
        console.log('💳 Stripe payment service initialized');
      }).catch(err => {
        console.log('💳 Stripe module not found, payments disabled. Run: npm install stripe');
      });
    } else {
      console.log('💳 Stripe not configured — payments will use demo mode');
    }

    // Track checkout sessions: sessionId -> { username, type: 'premium' | 'unban' }
    this.pendingSessions = new Map();
  }

  /**
   * Create a premium subscription checkout session
   */
  async createPremiumCheckoutSession(username, successUrl, cancelUrl) {
    if (!this.isConfigured || !this.stripe) {
      // Demo mode — return a fake session
      const demoSessionId = 'demo_' + Date.now();
      this.pendingSessions.set(demoSessionId, { username, type: 'premium' });
      return {
        success: true,
        sessionId: demoSessionId,
        url: `${successUrl}?session_id=${demoSessionId}`,
        demo: true,
      };
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'ShadowChat Premium',
              description: 'Gender filters, priority matching, and more',
            },
            unit_amount: PREMIUM_PRICE_CENTS,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: { username, type: 'premium' },
      });

      this.pendingSessions.set(session.id, { username, type: 'premium' });

      return {
        success: true,
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      console.error('💳 Stripe error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create an unban payment checkout session
   */
  async createUnbanCheckoutSession(username, successUrl, cancelUrl) {
    if (!this.isConfigured || !this.stripe) {
      // Demo mode
      const demoSessionId = 'demo_unban_' + Date.now();
      this.pendingSessions.set(demoSessionId, { username, type: 'unban' });
      return {
        success: true,
        sessionId: demoSessionId,
        url: `${successUrl}?session_id=${demoSessionId}`,
        demo: true,
      };
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'ShadowChat — Account Unban',
              description: 'Remove ban from your ShadowChat account',
            },
            unit_amount: UNBAN_PRICE_CENTS,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: { username, type: 'unban' },
      });

      this.pendingSessions.set(session.id, { username, type: 'unban' });

      return {
        success: true,
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      console.error('💳 Stripe error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify and process a completed payment
   */
  async verifyAndProcess(sessionId) {
    const pending = this.pendingSessions.get(sessionId);
    if (!pending) {
      return { success: false, error: 'Unknown session' };
    }

    const { username, type } = pending;

    // In demo mode (session starts with 'demo_'), auto-approve
    if (sessionId.startsWith('demo_')) {
      this.pendingSessions.delete(sessionId);

      if (type === 'premium') {
        this.authService.activatePremium(username, 30);
        return { success: true, type: 'premium', username };
      } else if (type === 'unban') {
        this.authService.unbanUser(username);
        return { success: true, type: 'unban', username };
      }
    }

    // Real Stripe verification
    if (this.stripe) {
      try {
        const session = await this.stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid') {
          this.pendingSessions.delete(sessionId);

          if (type === 'premium') {
            this.authService.activatePremium(username, 30);
            return { success: true, type: 'premium', username };
          } else if (type === 'unban') {
            this.authService.unbanUser(username);
            return { success: true, type: 'unban', username };
          }
        }
        return { success: false, error: 'Payment not completed' };
      } catch (error) {
        console.error('💳 Verification error:', error.message);
        return { success: false, error: error.message };
      }
    }

    return { success: false, error: 'Payment system not configured' };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(rawBody, signature, webhookSecret) {
    if (!this.stripe) return { success: false, error: 'Stripe not configured' };

    try {
      const event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { username, type } = session.metadata || {};

        if (username && type === 'premium') {
          this.authService.activatePremium(username, 30);
          console.log(`💳 Webhook: Premium activated for ${username}`);
        } else if (username && type === 'unban') {
          this.authService.unbanUser(username);
          console.log(`💳 Webhook: ${username} unbanned via payment`);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('💳 Webhook error:', error.message);
      return { success: false, error: error.message };
    }
  }
}
