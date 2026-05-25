const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Subscriber', subscriberSchema);
