const mongoose = require('mongoose');

const ticketTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  capacity: { type: Number, required: true, min: 1 },
  sold: { type: Number, default: 0, min: 0 },
  description: { type: String, trim: true },
}, { _id: true });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  image: { type: String },
  images: [{ type: String }],
  venue: { type: String, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  startDateTime: { type: Date, required: true },
  endDateTime: { type: Date },
  category: {
    type: String,
    enum: ['concert', 'party', 'gala', 'community', 'festival', 'other'],
    default: 'other',
  },
  ticketTypes: [ticketTypeSchema],
  status: {
    type: String,
    enum: ['draft', 'on_sale', 'sold_out', 'closed'],
    default: 'draft',
  },
  postedBy: { type: String, enum: ['admin', 'user'], default: 'admin' },
  posterName: { type: String, trim: true },
  posterEmail: { type: String, trim: true },
  listingFee: { type: Number, default: 0 },
  listingPaid: { type: Boolean, default: false },
  listingPaymentId: { type: String },
  featured: { type: Boolean, default: false },
  published: { type: Boolean, default: false },
  tags: [{ type: String }],
}, { timestamps: true });

eventSchema.virtual('totalCapacity').get(function () {
  return this.ticketTypes.reduce((s, t) => s + t.capacity, 0);
});

eventSchema.virtual('totalSold').get(function () {
  return this.ticketTypes.reduce((s, t) => s + t.sold, 0);
});

module.exports = mongoose.model('Event', eventSchema);
