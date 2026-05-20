const mongoose = require('mongoose');

const aboutSchema = new mongoose.Schema({
  overviewImage: { type: String, default: '' },
  title: { type: String, default: '' },
  introParagraph: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('About', aboutSchema);
