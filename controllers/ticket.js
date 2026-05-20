const QRCode = require('qrcode');
const IssuedTicket = require('../models/IssuedTicket');

exports.getAllTickets = async (req, res) => {
  try {
    const { from, to, event } = req.query;
    const filter = {};
    if (from || to) {
      filter.issuedAt = {};
      if (from) filter.issuedAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.issuedAt.$lte = toDate;
      }
    }
    if (event) filter.eventName = { $regex: event, $options: 'i' };
    const tickets = await IssuedTicket.find(filter).sort({ issuedAt: -1 });
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getQrImage = async (req, res) => {
  try {
    const ticket = await IssuedTicket.findOne({ ticketId: req.params.ticketId }).select('ticketId');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    const buffer = await QRCode.toBuffer(ticket.ticketId, { type: 'png', width: 300, margin: 2 });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch {
    res.status(500).json({ success: false, message: 'Failed to generate QR code' });
  }
};

exports.getPublicTicket = async (req, res) => {
  try {
    const ticket = await IssuedTicket.findOne({ ticketId: req.params.ticketId })
      .populate('eventId', 'title startDateTime venue city state image category');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({
      success: true,
      ticket: {
        ticketId: ticket.ticketId,
        eventName: ticket.eventName,
        buyerName: ticket.buyerName,
        ticketTypeName: ticket.ticketTypeName,
        status: ticket.status,
        issuedAt: ticket.issuedAt,
        scannedAt: ticket.scannedAt,
        event: ticket.eventId,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
  }
};

exports.getTicket = async (req, res) => {
  try {
    const ticket = await IssuedTicket.findOne({ ticketId: req.params.ticketId })
      .populate('eventId', 'title startDateTime venue city state');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({
      success: true,
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        eventName: ticket.eventName,
        buyerName: ticket.buyerName,
        buyerEmail: ticket.buyerEmail,
        ticketTypeName: ticket.ticketTypeName,
        orderId: ticket.orderId,
        issuedAt: ticket.issuedAt,
        scannedAt: ticket.scannedAt,
        scannedBy: ticket.scannedBy,
        event: ticket.eventId,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
  }
};

exports.voidTicket = async (req, res) => {
  try {
    const ticket = await IssuedTicket.findOne({ ticketId: req.params.ticketId });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (ticket.status === 'used') {
      return res.status(409).json({ success: false, message: 'Cannot void a ticket that has already been used' });
    }
    if (ticket.status === 'voided') {
      return res.status(409).json({ success: false, message: 'Ticket is already voided' });
    }
    ticket.status = 'voided';
    ticket.scannedAt = new Date();
    ticket.scannedBy = req.admin?.email || req.admin?.name || 'scanner';
    await ticket.save();
    res.json({
      success: true,
      message: 'Ticket voided successfully',
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        eventName: ticket.eventName,
        buyerName: ticket.buyerName,
        buyerEmail: ticket.buyerEmail,
        ticketTypeName: ticket.ticketTypeName,
        orderId: ticket.orderId,
        issuedAt: ticket.issuedAt,
        scannedAt: ticket.scannedAt,
        scannedBy: ticket.scannedBy,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to void ticket' });
  }
};

exports.scanTicket = async (req, res) => {
  try {
    const ticket = await IssuedTicket.findOne({ ticketId: req.params.ticketId })
      .populate('eventId', 'title startDateTime venue city state');

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    if (ticket.status === 'used') {
      return res.status(409).json({
        success: false,
        message: 'Ticket already used',
        ticket: {
          ticketId: ticket.ticketId,
          status: ticket.status,
          eventName: ticket.eventName,
          buyerName: ticket.buyerName,
          ticketTypeName: ticket.ticketTypeName,
          scannedAt: ticket.scannedAt,
          scannedBy: ticket.scannedBy,
        },
      });
    }

    if (ticket.status !== 'valid') {
      return res.status(400).json({
        success: false,
        message: `Ticket is ${ticket.status}`,
        ticket: {
          ticketId: ticket.ticketId,
          status: ticket.status,
          eventName: ticket.eventName,
          buyerName: ticket.buyerName,
        },
      });
    }

    ticket.status = 'used';
    ticket.scannedAt = new Date();
    ticket.scannedBy = req.admin?.email || req.admin?.name || 'scanner';
    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket validated successfully',
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        eventName: ticket.eventName,
        buyerName: ticket.buyerName,
        buyerEmail: ticket.buyerEmail,
        ticketTypeName: ticket.ticketTypeName,
        orderId: ticket.orderId,
        issuedAt: ticket.issuedAt,
        scannedAt: ticket.scannedAt,
        scannedBy: ticket.scannedBy,
        event: ticket.eventId,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to scan ticket' });
  }
};
