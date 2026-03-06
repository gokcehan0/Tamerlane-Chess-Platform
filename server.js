require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const admin = require('firebase-admin');
const { Resend } = require('resend');

// Custom Middleware
const { apiLimiter, authLimiter } = require('./server/middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 8080;

// --- SECURITY & PERFORMANCE MIDDLEWARE ---
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(compression());
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['https://tamerlane-chess.fly.dev'];
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (server-to-server, curl, mobile apps)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    }
}));
app.use(express.json());
app.use(morgan('combined'));

// Apply Rate Limiting
app.use('/api', apiLimiter);

// --- FIREBASE ADMIN INIT ---
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('ascii'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });
        console.log("🔥 Firebase Admin Initialized (Production)");
    } else {
        try {
            const serviceAccount = require('./serviceAccountKey.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: process.env.FIREBASE_DATABASE_URL
            });
            console.log("🔥 Firebase Admin Initialized (Local File)");
        } catch (e) {
            console.warn("⚠️ No serviceAccountKey.json and no FIREBASE_SERVICE_ACCOUNT env. Firebase Admin skipped.");
        }
    }
} catch (e) {
    console.error("❌ Firebase Init Error:", e.message);
}

// --- WORKER INIT ---
let workerCleanup = null;
if (admin.apps.length > 0) {
    try {
        const { initQueueWorker } = require('./server/worker');
        workerCleanup = initQueueWorker(admin.database());
        console.log("✅ Worker thread started");
        
        // Start cleanup job
        const { initCleanupJob } = require('./server/cleanupJob');
        initCleanupJob(admin.database());
    } catch (e) {
        console.error("❌ Failed to start worker:", e.message);
    }
} else {
    console.warn("⚠️ Worker not started: Firebase Admin not initialized");
}

// --- RESEND INIT (Graceful) ---
let resend;
if (process.env.RESEND_API_KEY) {
    try {
        resend = new Resend(process.env.RESEND_API_KEY);
        console.log("✅ Resend Email Service Initialized");
    } catch (e) {
        console.warn("⚠️ Failed to init Resend:", e.message);
    }
} else {
    console.warn("⚠️ RESEND_API_KEY missing. Email features will be disabled.");
}

// --- API ROUTES ---

app.get('/api/status', (req, res) => {
    res.json({ status: 'online', timestamp: new Date().toISOString() });
});

// --- Admin Auth Middleware for Diagnostic Endpoints ---
function requireAdminToken(req, res, next) {
    const token = req.headers['x-admin-key'];
    if (!process.env.INTERNAL_API_TOKEN || token !== process.env.INTERNAL_API_TOKEN) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
}

// Health check with detailed system info
app.get('/api/health', requireAdminToken, async (req, res) => {
    const startTime = Date.now();
    const checks = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            unit: 'MB'
        },
        firebase: 'unknown',
        latency: 0
    };
    
    // Check Firebase connection
    try {
        if (admin.apps.length > 0) {
            const connRef = admin.database().ref('.info/connected');
            const snap = await connRef.once('value');
            checks.firebase = snap.val() === true ? 'connected' : 'disconnected';
        } else {
            checks.firebase = 'not_initialized';
        }
    } catch (e) {
        checks.firebase = 'error';
        checks.status = 'degraded';
    }
    
    checks.latency = Date.now() - startTime;
    
    const statusCode = checks.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(checks);
});

// Cache statistics endpoint
app.get('/api/cache-stats', requireAdminToken, (req, res) => {
    try {
        const gameCache = require('./server/cache/gameCache');
        res.json(gameCache.getStats());
    } catch (e) {
        res.status(500).json({ error: 'Cache not available' });
    }
});

// Prometheus-format metrics endpoint
app.get('/api/metrics', requireAdminToken, (req, res) => {
    try {
        const metrics = require('./server/utils/metrics');
        res.type('text/plain').send(metrics.getPrometheusMetrics());
    } catch (e) {
        res.status(500).send('# Metrics not available');
    }
});

// JSON metrics endpoint
app.get('/api/metrics/json', requireAdminToken, (req, res) => {
    try {
        const metrics = require('./server/utils/metrics');
        res.json(metrics.getMetrics());
    } catch (e) {
        res.status(500).json({ error: 'Metrics not available' });
    }
});

// Circuit breaker status
app.get('/api/circuit-status', requireAdminToken, (req, res) => {
    try {
        const cb = require('./server/utils/circuitBreaker');
        res.json(cb.getStatus());
    } catch (e) {
        res.status(500).json({ error: 'Circuit breaker not available' });
    }
});

// --- OTP UTILS ---
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

function sanitizeEmail(email) {
    return email.replace(/\./g, '_').toLowerCase();
}

async function storeOTP(email, code, type) {
    const safeEmail = sanitizeEmail(email);
    const expires = Date.now() + 2 * 60 * 1000; // 2 minutes
    await admin.database().ref(`secure_codes/${safeEmail}`).set({
        code,
        type,
        expires,
        attempts: 0
    });
}

// --- AUTH ROUTES (OTP BASED) ---

// 1. Send OTP (Generic for Verify or Reset)
app.post('/api/auth/send-code', authLimiter, async (req, res) => {
    const { email, type } = req.body; // type: 'VERIFY' or 'RESET'
    if (!email || !type) return res.status(400).json({ error: 'Email and type required' });

    if (!resend) return res.status(503).json({ error: 'Email service unconfigured.' });

    try {
        const code = generateOTP();
        await storeOTP(email, code, type);

        const subject = type === 'RESET' ? 'Password Reset Code' : 'Verification Code';
        const title = type === 'RESET' ? 'Reset Your Password' : 'Verify Your Email';
        const message = type === 'RESET' 
            ? 'Use the code below to reset your password. If you did not request this, ignore this email.'
            : 'Use the code below to verify your email address.';

        const data = await resend.emails.send({
            from: 'Tamerlane Chess <noreply@tamerlane-chess.com>',
            to: [email],
            subject: `${subject} - Tamerlane Chess`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">♟ Tamerlane Chess</h1>
                    </div>
                    <div style="padding: 40px 30px; color: #e5e5e5; text-align: center;">
                        <h2 style="color: white; margin-top: 0;">${title}</h2>
                        <p style="color: #a3a3a3; line-height: 1.6;">${message}</p>
                        
                        <div style="background: #333; letter-spacing: 5px; font-family: monospace; font-size: 32px; font-weight: bold; color: #10b981; padding: 20px; border-radius: 8px; margin: 30px auto; display: inline-block; min-width: 200px;">
                            ${code}
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px;">This code will expire in 2 minutes.</p>
                    </div>
                    <div style="background: #262626; padding: 20px 30px; text-align: center; border-top: 1px solid #333;">
                        <p style="color: #6b7280; font-size: 12px; margin: 0;">© 2024 Tamerlane Chess. All rights reserved.</p>
                    </div>
                </div>
            `
        });
        
        res.json({ success: true, message: 'Code sent successfully' });
    } catch (e) {
        console.error("Send OTP Error:", e);
        res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
    }
});

// 2. Verify Email with Code
app.post('/api/auth/verify-email-code', authLimiter, async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

    try {
        const safeEmail = sanitizeEmail(email);
        const ref = admin.database().ref(`secure_codes/${safeEmail}`);
        const snap = await ref.once('value');
        const data = snap.val();

        if (!data) return res.status(400).json({ error: 'Invalid or expired code' });
        
        // Check attempt limit (max 3 tries)
        if (data.attempts >= 3) {
            await ref.remove();
            return res.status(400).json({ error: 'Too many failed attempts. Please request a new code.' });
        }
        
        // Check expiration
        if (Date.now() > data.expires) {
            await ref.remove();
            return res.status(400).json({ error: 'Code expired. Please request a new code.' });
        }
        
        // Check code type
        if (data.type !== 'VERIFY') return res.status(400).json({ error: 'Invalid code type' });
        
        // Check code - increment attempts on failure
        if (data.code !== code) {
            await ref.update({ attempts: (data.attempts || 0) + 1 });
            const remaining = 2 - (data.attempts || 0);
            return res.status(400).json({ error: `Incorrect code. ${remaining} attempt(s) remaining.` });
        }

        // Success - Mark user as verified
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().updateUser(user.uid, { emailVerified: true });
        
        // Cleanup code
        await ref.remove();

        console.log(`✅ Email verified for ${email}`);
        res.json({ success: true, message: 'Email verified successfully' });
    } catch (e) {
        console.error("Verify OTP Error:", e);
        res.status(500).json({ error: 'Verification failed. Please try again.' });
    }
});

// 3. Reset Password with Code
app.post('/api/auth/reset-password-with-code', authLimiter, async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'Email, code, and new password required' });
    
    // Server-side password validation
    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!/[A-Z]/.test(newPassword)) {
        return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[0-9]/.test(newPassword)) {
        return res.status(400).json({ error: 'Password must contain at least one number' });
    }

    try {
        const safeEmail = sanitizeEmail(email);
        const ref = admin.database().ref(`secure_codes/${safeEmail}`);
        const snap = await ref.once('value');
        const data = snap.val();

        if (!data) return res.status(400).json({ error: 'Invalid or expired code' });
        
        // Check attempt limit (max 3 tries)
        if (data.attempts >= 3) {
            await ref.remove();
            return res.status(400).json({ error: 'Too many failed attempts. Please request a new code.' });
        }
        
        // Check expiration
        if (Date.now() > data.expires) {
            await ref.remove();
            return res.status(400).json({ error: 'Code expired. Please request a new code.' });
        }
        
        // Check code type
        if (data.type !== 'RESET') return res.status(400).json({ error: 'Invalid code type' });
        
        // Check code - increment attempts on failure
        if (data.code !== code) {
            await ref.update({ attempts: (data.attempts || 0) + 1 });
            const remaining = 2 - (data.attempts || 0);
            return res.status(400).json({ error: `Incorrect code. ${remaining} attempt(s) remaining.` });
        }

        // Success - Update Password
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().updateUser(user.uid, { password: newPassword });

        // Cleanup code
        await ref.remove();

        console.log(`✅ Password reset for ${email}`);
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (e) {
        console.error("Reset PW Error:", e);
        res.status(500).json({ error: 'Password reset failed. Please try again.' });
    }
});

// --- DYNAMIC OG META TAGS FOR GAME LINKS ---
// WhatsApp/Discord/Twitter crawlers için özel OG banner'ları
const fs = require('fs');

// Sanitize string for safe HTML embedding (prevent XSS)
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function generateOGPage(gameType, roomCode) {
    // Sanitize roomCode: only allow alphanumeric characters
    const safeRoomCode = String(roomCode).replace(/[^a-zA-Z0-9]/g, '');
    const isClassic = gameType === 'classic';
    const title = isClassic ? 'Classic Chess - Join Game' : 'Tamerlane Chess - Join Game';
    const description = isClassic 
        ? 'Join this Classic Chess game on Tamerlane Chess!'
        : 'Join this Tamerlane Chess game! A unique chess variant with elephants, camels &amp; dabbabahs.';
    const image = isClassic 
        ? 'https://tamerlane-chess.fly.dev/images/og-classic.png'
        : 'https://tamerlane-chess.fly.dev/images/og-tamerlane.png';
    const url = isClassic 
        ? `https://tamerlane-chess.fly.dev/game/classic/${safeRoomCode}`
        : `https://tamerlane-chess.fly.dev/game/${safeRoomCode}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escapeHtml(url)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    <meta http-equiv="refresh" content="0; url=${escapeHtml(url)}">
</head>
<body>
    <p>Redirecting to game...</p>
</body>
</html>`;
}

// Check if request is from a social media crawler
function isSocialCrawler(userAgent) {
    if (!userAgent) return false;
    const crawlers = ['facebookexternalhit', 'twitterbot', 'linkedinbot', 'whatsapp', 'discordbot', 'telegrambot', 'slackbot'];
    return crawlers.some(bot => userAgent.toLowerCase().includes(bot));
}

// OG routes for game links - BEFORE static files
app.get('/game/classic/:roomCode', (req, res, next) => {
    if (isSocialCrawler(req.headers['user-agent'])) {
        res.type('html').send(generateOGPage('classic', req.params.roomCode));
    } else {
        next();
    }
});

app.get('/game/:roomCode', (req, res, next) => {
    if (isSocialCrawler(req.headers['user-agent'])) {
        res.type('html').send(generateOGPage('tamerlane', req.params.roomCode));
    } else {
        next();
    }
});

// --- STATIC ASSETS ---
app.use(express.static(path.join(__dirname, 'dist'), {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=0');
        }
    }
}));

app.get('*', (req, res) => {
    const file = path.join(__dirname, 'dist', 'index.html');
    res.sendFile(file);
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`� Production Server running on port ${PORT}`);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    if (workerCleanup) {
        try { workerCleanup(); } catch (e) { console.error('Worker cleanup error:', e); }
    }
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    if (workerCleanup) {
        try { workerCleanup(); } catch (e) { console.error('Worker cleanup error:', e); }
    }
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});


