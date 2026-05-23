const mongoose = require('mongoose');

const eventAlbumSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  description: { type: String, trim: true, default: '' },
  eventName: { type: String, required: true, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('EventAlbum', eventAlbumSchema);
