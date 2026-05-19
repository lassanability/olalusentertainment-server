const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const issuedTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    default: () => `tkt-${uuidv4().split('-')[0]}`,
  },
  orderId: { type: String, required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  eventName: { type: String, required: true },
  buyerEmail: { type: String, required: true },
  buyerName: { type: String, required: true },
  ticketTypeName: { type: String },
  qrCodeData: { type: String },
  status: {
    type: String,
    enum: ['valid', 'used', 'refunded', 'voided'],
    default: 'valid',
  },
  issuedAt: { type: Date, default: Date.now },
  scannedAt: { type: Date },
  scannedBy: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('IssuedTicket', issuedTicketSchema);
