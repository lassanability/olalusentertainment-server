const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema({
  listingFee: { type: Number, default: 20000 },
}, { timestamps: true });

module.exports = mongoose.model('AppSettings', appSettingsSchema);
