const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true },
  relationship: { type: String, trim: true }, // "Family Member", "Client", etc.
  status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
  // TTL: pending comments auto-delete after 24h; null when approved
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
}, { timestamps: true });

// MongoDB TTL index — deletes doc when expiresAt passes; null/unset = never expires
commentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Comment', commentSchema);
