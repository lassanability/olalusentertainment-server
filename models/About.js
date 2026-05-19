const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  phone: { type: String, trim: true, default: '' },
}, { _id: false });

const aboutSchema = new mongoose.Schema({
  overviewImage: { type: String, default: '' },
  aboutHeading: { type: String, default: '' },
  introParagraph: { type: String, default: '' },
  checkItems: { type: [String], default: [] },
  statsCareTakers: { type: String, default: '' },
  statsYears: { type: String, default: '' },
  statsTicketsSold: { type: String, default: '' },
  missionHeading: { type: String, default: '' },
  missionParagraphs: { type: [String], default: [] },
  missionImage: { type: String, default: '' },
  visionHeading: { type: String, default: '' },
  visionBullets: { type: [String], default: [] },
  visionImage: { type: String, default: '' },
  branches: { type: [branchSchema], default: [] },
  appointmentAvatar: { type: String, default: '' },
  appointmentFeatures: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('About', aboutSchema);
