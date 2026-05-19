const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    default: () => `olalus-${uuidv4().split('-')[0]}`,
  },
  buyerEmail: { type: String, required: true, trim: true },
  buyerName: { type: String, required: true, trim: true },
  buyerPhone: { type: String, trim: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  eventName: { type: String, required: true },
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId },
  ticketTypeName: { type: String },
  ticketCount: { type: Number, required: true, min: 1 },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  paymentMethod: { type: String },
  squarePaymentId: { type: String },
  status: {
    type: String,
    enum: ['pending', 'pending_settlement', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paidAt: { type: Date },
  failureReason: { type: String },
  ticketIds: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
