const mongoose = require('mongoose');

const ALL_ROLES = ['banner', 'about', 'services', 'waiver', 'partners', 'testimonials', 'faq', 'jobs', 'resources', 'blog', 'contacts', 'comments', 'appointments'];

const adminUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  isSuperAdmin: { type: Boolean, default: false },
  roles: {
    type: [String],
    enum: ALL_ROLES,
    default: [],
  },
  isActive: { type: Boolean, default: true },
  passwordChangedFromDefault: { type: Boolean, default: false },
  envManaged: { type: Boolean, default: false },
  lastLogin: { type: Date },
}, { timestamps: true });

adminUserSchema.statics.ALL_ROLES = ALL_ROLES;

module.exports = mongoose.model('AdminUser', adminUserSchema);
