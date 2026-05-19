const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true, enum: ['privacy', 'non-discrimination'] },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  effectiveDate: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Policy', policySchema);
