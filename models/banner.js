const mongoose = require('mongoose');

const homeSchema = new mongoose.Schema({
  heroImage: { type: String, default: '' },
  blobImage: { type: String, default: '' },
  title: { type: String, default: 'WHERE ENTERTAINMENT LIVES.' },
  description: { type: String, default: '' },
  tagline: { type: String, default: 'NO1 ENTERTAINMENT SOLUTION' },
  statsEventsCount: { type: String, default: '250+' },
  statsEventsLabel: { type: String, default: 'EVENTS ORGANIZED' },
  statsTicketsCount: { type: String, default: '10K+' },
  statsTicketsLabel: { type: String, default: 'TICKET SOLD' },
}, { timestamps: true });

module.exports = mongoose.model('Banner', homeSchema);
