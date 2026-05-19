const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { status: 'error', message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const apiLimiter = createRateLimiter(
  15 * 60 * 1000, 100,
  'Too many requests, please try again later'
);

const authLimiter = createRateLimiter(
  60 * 60 * 1000, 10,
  'Too many authentication attempts, please try again later'
);

const anonLimiter = createRateLimiter(
  60 * 60 * 1000, 5,
  'Too many anonymous login attempts, please try again later'
);

const passwordResetLimiter = createRateLimiter(
  60 * 60 * 1000, 5,
  'Too many password reset attempts, please try again later'
);

const uploadLimiter = createRateLimiter(
  60 * 60 * 1000, 20,
  'Too many uploads, please try again later'
);

const aiLimiter = createRateLimiter(
  60 * 60 * 1000, 30,
  'Too many analysis requests, please try again later'
);

const contactLimiter = createRateLimiter(
  60 * 60 * 1000, 5,
  'Too many contact form submissions, please try again later'
);

const bulkLimiter = createRateLimiter(
  60 * 60 * 1000, 10,
  'Too many bulk operation requests, please try again later'
);

const deviceLimiter = createRateLimiter(
  60 * 60 * 1000, 20,
  'Too many device registration requests, please try again later'
);

const refreshLimiter = createRateLimiter(
  15 * 60 * 1000, 30,
  'Too many token refresh attempts, please try again later'
);

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return sanitizeValue(obj);

  const sanitized = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    if (key === 'password' || key === 'newPassword' || key === 'currentPassword') {
      sanitized[key] = obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeObject(obj[key]);
    } else {
      sanitized[key] = sanitizeValue(obj[key]);
    }
  }
  return sanitized;
};

const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    value = value.replace(/\0/g, '');
    value = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    value = value.trim();
    if (value.length > 10000) value = value.substring(0, 10000);
  }
  return value;
};

const sanitizeInput = (req, res, next) => {
  if (req.body)   req.body   = sanitizeObject(req.body);
  if (req.query)  req.query  = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
};

const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxBytes = parseSize(maxSize);
    if (contentLength > maxBytes) {
      return res.status(413).json({ status: 'error', message: 'Request entity too large' });
    }
    next();
  };
};

const parseSize = (size) => {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)?$/);
  if (!match) return 10 * 1024 * 1024;
  return parseInt(match[1], 10) * (units[match[2] || 'b'] || 1);
};

const suspiciousActivityTracker = new Map();

setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [ip, tracker] of suspiciousActivityTracker.entries()) {
    if (tracker.firstRequest < cutoff) {
      suspiciousActivityTracker.delete(ip);
    }
  }
}, 30 * 60 * 1000);

const SUSPICIOUS_PATTERNS = [
  'eval(', 'exec(', 'spawn(', 'require(',
  '<script', 'javascript:', 'onerror=',
  '$where', '$regex',
  'union select', 'drop table', 'insert into',
];

const trackSuspiciousActivity = (req, res, next) => {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.ip
    || req.connection.remoteAddress;
  const now = Date.now();

  let tracker = suspiciousActivityTracker.get(ip);
  if (!tracker) {
    tracker = { requests: 0, firstRequest: now, suspiciousPatterns: 0 };
    suspiciousActivityTracker.set(ip, tracker);
  }

  tracker.requests++;

  if (now - tracker.firstRequest > 60 * 60 * 1000) {
    tracker.requests = 1;
    tracker.firstRequest = now;
    tracker.suspiciousPatterns = 0;
  }

  if (req.body && typeof req.body === 'object') {
    const bodyStr = JSON.stringify(req.body).toLowerCase();
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (bodyStr.includes(pattern)) {
        tracker.suspiciousPatterns++;
        console.warn(`[Security] Suspicious pattern "${pattern}" from IP ${ip}`);
      }
    }
  }

  if (tracker.suspiciousPatterns > 5) {
    return res.status(403).json({ status: 'error', message: 'Access denied due to suspicious activity' });
  }

  next();
};

const parseAllowedOrigins = (website, adminDashboard) => {
  const base = [website, adminDashboard].filter(Boolean);
  try {
    const extra = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    return [...new Set([...base, ...extra])];
  } catch (_) {
    return base;
  }
};

const buildCorsOptions = (website, adminDashboard) => ({
  origin: (origin, callback) => {
    let allowedOrigins;
    try {
      allowedOrigins = parseAllowedOrigins(website, adminDashboard);
    } catch (_) {
      allowedOrigins = [website, adminDashboard].filter(Boolean);
    }

    const isLocalhost = !origin || /^https?:\/\/localhost(:\d+)?$/.test(origin);
    if (isLocalhost || allowedOrigins.includes(origin)) {
      callback(null, origin || true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-mobile-app', 'x-platform', 'x-dashboard-key'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400,
});

const applySecurityMiddleware = (app) => {
  app.use(securityHeaders);
  app.use(mongoSanitize());
  app.use(xss());
  app.use(hpp({ whitelist: ['type', 'date', 'limit', 'offset', 'sort'] }));
  app.use(sanitizeInput);
  app.use(trackSuspiciousActivity);
  app.use(requestSizeLimiter('10mb'));
};

module.exports = {
  apiLimiter,
  authLimiter,
  anonLimiter,
  passwordResetLimiter,
  refreshLimiter,
  uploadLimiter,
  aiLimiter,
  contactLimiter,
  bulkLimiter,
  deviceLimiter,
  securityHeaders,
  sanitizeInput,
  requestSizeLimiter,
  trackSuspiciousActivity,
  buildCorsOptions,
  applySecurityMiddleware,
};
