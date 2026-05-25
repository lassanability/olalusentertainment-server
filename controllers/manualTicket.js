const { v4: uuidv4 } = require('uuid');
const ManualTicketRequest = require('../models/ManualTicketRequest');
const Order = require('../models/Order');
const Event = require('../models/Event');
const seaweed = require('../config/storage');
const { issueTickets } = require('../services/ticketService');
const { logActivity } = require('../utils/logger');

exports.getAll = async (req, res) => {
  try {
    const requests = await ManualTicketRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      buyerName, buyerEmail, buyerPhone,
      eventId, ticketTypeId, ticketCount,
      amountPaid, paymentId, notes,
    } = req.body;

    if (!buyerName?.trim() || !buyerEmail?.trim() || !eventId) {
      return res.status(400).json({ success: false, message: 'Buyer name, email, and event are required' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const ticketType = ticketTypeId ? event.ticketTypes.id(ticketTypeId) : event.ticketTypes[0];

    let paymentProofUrl = '';
    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      const key = `manual-tickets/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      await seaweed.uploadFile(req.file.buffer, key, req.file.mimetype);
      paymentProofUrl = `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${key}`;
    }

    const request = await ManualTicketRequest.create({
      buyerName: buyerName.trim(),
      buyerEmail: buyerEmail.trim(),
      buyerPhone: buyerPhone?.trim() || '',
      eventId: event._id,
      eventName: event.title,
      ticketTypeId: ticketType?._id?.toString() || '',
      ticketTypeName: ticketType?.name || '',
      ticketCount: parseInt(ticketCount, 10) || 1,
      amountPaid: Math.round(parseFloat(amountPaid || 0) * 100),
      paymentId: paymentId?.trim() || '',
      paymentProofUrl,
      notes: notes?.trim() || '',
    });

    await logActivity(req.admin, 'create', 'ManualTicketRequest', request._id, { buyerEmail: request.buyerEmail, event: event.title });
    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const request = await ManualTicketRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status === 'approved') return res.status(400).json({ success: false, message: 'Already approved' });

    const event = await Event.findById(request.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event no longer exists' });

    const orderId = `olalus-manual-${uuidv4().split('-')[0]}`;

    const order = await Order.create({
      orderId,
      buyerEmail: request.buyerEmail,
      buyerName: request.buyerName,
      buyerPhone: request.buyerPhone,
      eventId: request.eventId,
      eventName: request.eventName,
      ticketTypeId: request.ticketTypeId || undefined,
      ticketTypeName: request.ticketTypeName,
      ticketCount: request.ticketCount,
      amount: request.amountPaid,
      paymentMethod: 'manual',
      squarePaymentId: request.paymentId || '',
      status: 'paid',
      paidAt: new Date(),
    });

    const eventAddress = [event.address, event.venue, event.city, event.state].filter(Boolean).join(', ');

    const ticketIds = await issueTickets({
      ...order.toObject(),
      orderId,
      eventDate: event.startDateTime,
      eventAddress,
      eventCategory: event.category,
    });

    if (request.ticketTypeId) {
      await Event.findOneAndUpdate(
        { _id: event._id, 'ticketTypes._id': request.ticketTypeId },
        { $inc: { 'ticketTypes.$.sold': request.ticketCount } }
      );
    }

    request.status = 'approved';
    request.approvedBy = req.admin?.name || req.admin?.email || 'Admin';
    request.approvedAt = new Date();
    request.generatedOrderId = orderId;
    request.ticketIds = ticketIds;
    await request.save();

    await logActivity(req.admin, 'approve', 'ManualTicketRequest', request._id, { orderId, buyerEmail: request.buyerEmail });
    res.json({ success: true, request });
  } catch (err) {
    console.error('[!] Manual ticket approval error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const request = await ManualTicketRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status === 'approved') return res.status(400).json({ success: false, message: 'Cannot reject an already approved request' });

    request.status = 'rejected';
    request.rejectionReason = req.body.reason?.trim() || '';
    await request.save();

    await logActivity(req.admin, 'reject', 'ManualTicketRequest', request._id, { buyerEmail: request.buyerEmail });
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const request = await ManualTicketRequest.findByIdAndDelete(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    await logActivity(req.admin, 'delete', 'ManualTicketRequest', request._id, { buyerEmail: request.buyerEmail });
    res.json({ success: true, message: 'Request deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
