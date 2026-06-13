import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { server, wss, authService, paymentService } from './websocket.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS for frontend (only allow known origins)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, health checks)
    if (!origin) return callback(null, true);
    const allowed = [
      'https://spectre-1.vercel.app',
      /^http:\/\/localhost(:\d+)?$/,
    ];
    const isAllowed = allowed.some(p => p instanceof RegExp ? p.test(origin) : p === origin);
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Security headers
app.use(helmet());

// Rate limit auth endpoints (15 attempts per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts. Please try again later.' },
});

// JSON body parsing with size limit (except for webhook which needs raw body)
app.use((req, res, next) => {
  if (req.path === '/api/webhook') {
    next(); // Skip JSON parsing for Stripe webhook
  } else {
    express.json({ limit: '16kb' })(req, res, next);
  }
});

// ── Root Endpoint ──
app.get('/', (req, res) => {
  res.send('Spectre Server is running.');
});

// ── Health Check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', connections: wss.clients.size });
});

// ── Auth Endpoints ──

app.post('/api/register', authLimiter, (req, res) => {
  const { username, password } = req.body;
  const result = authService.register(username, password);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

app.post('/api/login', authLimiter, (req, res) => {
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

app.post('/api/checkout/premium', (req, res) => {
  res.status(501).json({ success: false, error: 'Premium tier is disabled' });
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

  // Block if Stripe is not configured (no demo mode in production)
  if (!paymentService.isConfigured) {
    return res.status(503).json({ success: false, error: 'Payment system not available' });
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

  // Require auth to verify a payment
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = authService.verifyToken(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
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
║   🌑 Spectre Server                                   ║
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
