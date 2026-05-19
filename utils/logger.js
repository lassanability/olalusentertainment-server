const ActivityLog = require('../models/activityLog');

/**
 * Log an admin action. Fire-and-forget — never throws.
 * @param {object} admin  - req.admin (from JWT middleware)
 * @param {string} action - 'create' | 'update' | 'delete' | 'login' | 'approve' | 'reject' | 'changePassword'
 * @param {string} resource - 'blog' | 'job' | 'comment' | 'adminUser' | ...
 * @param {string} [resourceId]
 * @param {string} [details]
 */
async function logActivity(admin, action, resource, resourceId, details) {
  try {
    await ActivityLog.create({
      adminId: admin?.id || admin?._id,
      adminEmail: admin?.email,
      adminName: admin?.name,
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : undefined,
      details,
    });
  } catch (err) {
    console.warn('[Logger] Failed to write activity log:', err.message);
  }
}

module.exports = { logActivity };
