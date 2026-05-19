const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  adminEmail: { type: String },
  adminName: { type: String },
  action: { type: String, required: true }, // 'login', 'create', 'update', 'delete', 'approve', 'reject', 'changePassword'
  resource: { type: String }, // 'blog', 'job', 'comment', 'adminUser', etc.
  resourceId: { type: String },
  details: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
