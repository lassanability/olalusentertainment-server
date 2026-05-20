const mongoose = require('mongoose');

const contactInfoSchema = new mongoose.Schema({
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  location: { type: String, default: '' },
  instagramUrl: { type: String, default: '' },
  twitterUrl: { type: String, default: '' },
  facebookUrl: { type: String, default: '' },
  tiktokUrl: { type: String, default: '' },
  youtubeUrl: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('ContactInfo', contactInfoSchema);
