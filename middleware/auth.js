const jwt = require('jsonwebtoken');

// ── JWT helpers ─────────────────────────────────────────────────────────────

const verifyToken = (req) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

// ── Middleware ───────────────────────────────────────────────────────────────

/** Requires a valid JWT. Populates req.admin. */
exports.requireAuth = (req, res, next) => {
  const admin = verifyToken(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized — please log in' });
  if (!admin.isActive) return res.status(403).json({ success: false, message: 'Account is deactivated' });
  req.admin = admin;
  next();
};

/** Requires valid JWT AND the admin must be the super admin. */
exports.requireSuperAdmin = (req, res, next) => {
  const admin = verifyToken(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!admin.isSuperAdmin) return res.status(403).json({ success: false, message: 'Super admin access required' });
  req.admin = admin;
  next();
};

/** Requires valid JWT AND the admin must have the given role (or be super admin). */
exports.requireRole = (role) => (req, res, next) => {
  const admin = verifyToken(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!admin.isActive) return res.status(403).json({ success: false, message: 'Account is deactivated' });
  if (!admin.isSuperAdmin && !admin.roles?.includes(role)) {
    return res.status(403).json({ success: false, message: `Access denied — requires '${role}' role` });
  }
  req.admin = admin;
  next();
};

/** Legacy origin check — kept for public-facing write ops that need light protection. */
exports.validateDashboard = (req, res, next) => {
  // Try JWT first
  const admin = verifyToken(req);
  if (admin) {
    req.admin = admin;
    return next();
  }
  // Fall back to origin check
  const source = req.headers.origin || req.headers.referer || '';
  const allowed = [process.env.ADMIN_DASHBOARD, 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:5300'].filter(Boolean);
  if (source && allowed.length > 0 && !allowed.some((a) => source.startsWith(a))) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};
