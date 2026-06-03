import express from 'express';
import cors from 'cors';
import { server, wss, authService, paymentService } from './websocket.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS for frontend (allows local dev and Vercel deployments)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost') || origin.includes('vercel.app') || origin.includes('render.com')) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback to avoid deployment blockages
    }
  },
  credentials: true,
}));

// JSON body parsing (except for webhook which needs raw body)
app.use((req, res, next) => {
  if (req.path === '/api/webhook') {
    next(); // Skip JSON parsing for Stripe webhook
  } else {
    express.json()(req, res, next);
  }
});

// ── Root Endpoint ──
app.get('/', (req, res) => {
  res.send('ShadowChat Server is running.');
});

// ── Health Check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', connections: wss.clients.size });
});

// ── Auth Endpoints ──

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  const result = authService.register(username, password);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const result = authService.login(username, password);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(401).json(result);
  }
});

app.get('/api/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = authService.verifyToken(token);
  
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }
});

app.post('/api/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) authService.logout(token);
  res.json({ success: true });
});

// ── Payment Endpoints ──

app.post('/api/checkout/premium', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = authService.verifyToken(token);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  const origin = req.headers.origin || 'http://localhost:5173';
  const result = await paymentService.createPremiumCheckoutSession(
    user.username,
    `${origin}/#payment-success`,
    `${origin}/#payment-cancelled`
  );

  res.json(result);
});

app.post('/api/checkout/unban', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = authService.verifyToken(token);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  if (!user.isBanned) {
    return res.status(400).json({ success: false, error: 'Account is not banned' });
  }

  const origin = req.headers.origin || 'http://localhost:5173';
  const result = await paymentService.createUnbanCheckoutSession(
    user.username,
    `${origin}/#payment-success`,
    `${origin}/#payment-cancelled`
  );

  res.json(result);
});

app.get('/api/payment/verify', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ success: false, error: 'Missing session_id' });
  }

  const result = await paymentService.verifyAndProcess(session_id);
  res.json(result);
});

// Stripe Webhook (needs raw body)
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }

  const result = await paymentService.handleWebhook(req.body, sig, webhookSecret);
  res.json(result);
});

// ── Mount Express on the HTTP server ──
server.on('request', app);

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🌑 ShadowChat Server                                ║
║                                                        ║
║   Server running on port ${PORT}                        ║
║                                                        ║
║   Endpoints:                                           ║
║   - WebSocket: ws://localhost:${PORT}                   ║
║   - Health:   http://localhost:${PORT}/health           ║
║   - Auth:     http://localhost:${PORT}/api/register     ║
║   -           http://localhost:${PORT}/api/login        ║
║   - Payments: http://localhost:${PORT}/api/checkout/*   ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});
