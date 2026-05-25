const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const manualTicketSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true,
    default: () => `mtr-${uuidv4().split('-')[0]}`,
  },
  buyerName: { type: String, required: true, trim: true },
  buyerEmail: { type: String, required: true, trim: true },
  buyerPhone: { type: String, trim: true, default: '' },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  eventName: { type: String, required: true },
  ticketTypeId: { type: String, default: '' },
  ticketTypeName: { type: String, default: '' },
  ticketCount: { type: Number, required: true, min: 1, default: 1 },
  amountPaid: { type: Number, default: 0 },
  paymentId: { type: String, trim: true, default: '' },
  paymentProofUrl: { type: String, default: '' },
  notes: { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvedBy: { type: String, default: '' },
  approvedAt: { type: Date },
  rejectionReason: { type: String, default: '' },
  generatedOrderId: { type: String, default: '' },
  ticketIds: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('ManualTicketRequest', manualTicketSchema);
