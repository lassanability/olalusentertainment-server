const mongoose = require('mongoose');

const contactInfoSchema = new mongoose.Schema({
  phone: { type: String, default: '' },
  fax: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  workingDays: { type: String, default: '' },
  workingHours: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('ContactInfo', contactInfoSchema);
