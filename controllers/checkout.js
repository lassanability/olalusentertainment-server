const { randomUUID } = require('crypto');
const squareClient = require('../services/squareClient');
const Order = require('../models/Order');
const Event = require('../models/Event');
const { issueTickets } = require('../services/ticketService');

exports.processPayment = async (req, res) => {
  const { sourceId, paymentMethod, eventId, ticketTypeId, ticketCount, buyerEmail, buyerName, buyerPhone } = req.body;

  if (!sourceId || !eventId || !ticketCount || !buyerEmail || !buyerName) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const ticketType = ticketTypeId
      ? event.ticketTypes.id(ticketTypeId)
      : event.ticketTypes[0];

    if (!ticketType) return res.status(400).json({ success: false, message: 'Ticket type not found' });

    const available = ticketType.capacity - ticketType.sold;
    if (ticketCount > available) {
      return res.status(400).json({ success: false, message: 'Not enough tickets available' });
    }

    const amount = ticketType.price * ticketCount;

    const order = await Order.create({
      buyerEmail,
      buyerName,
      buyerPhone,
      eventId: event._id,
      eventName: event.title,
      ticketTypeId: ticketType._id,
      ticketTypeName: ticketType.name,
      ticketCount,
      amount,
      paymentMethod: paymentMethod || 'card',
      status: 'pending',
    });

    const { result } = await squareClient.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: { amount: BigInt(amount), currency: 'USD' },
      locationId: process.env.SQUARE_LOCATION_ID,
      referenceId: order.orderId,
      note: `Olalus Entertainment — Order ${order.orderId}`,
      buyerEmailAddress: buyerEmail,
    });

    const payment = result.payment;

    await Order.findOneAndUpdate(
      { orderId: order.orderId },
      { squarePaymentId: payment.id }
    );

    if (payment.status === 'COMPLETED') {
      const eventAddress = [event.address, event.venue, event.city, event.state].filter(Boolean).join(', ');
      await issueTickets({
        ...order.toObject(),
        orderId: order.orderId,
        eventDate: event.startDateTime,
        eventAddress,
        eventCategory: event.category,
      });
      await Event.findOneAndUpdate(
        { _id: event._id, 'ticketTypes._id': ticketType._id },
        { $inc: { 'ticketTypes.$.sold': ticketCount } }
      );
    } else {
      await Order.findOneAndUpdate(
        { orderId: order.orderId },
        { status: 'pending_settlement' }
      );
    }

    res.json({
      success: true,
      orderId: order.orderId,
      paymentId: payment.id,
      status: payment.status,
    });
  } catch (err) {
    console.error('[!] Square payment error:', err);
    const message = err.errors?.[0]?.detail || err.message || 'Payment failed';
    res.status(500).json({ success: false, message });
  }
};

exports.getOrderStatus = async (req, res) => {
  try {
    const IssuedTicket = require('../models/IssuedTicket');
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const tickets = await IssuedTicket.find({ orderId: req.params.orderId }).select('ticketId status');
    const event = await Event.findById(order.eventId).select('title category image venue city state startDateTime').lean();
    res.json({ success: true, order: { ...order.toObject(), tickets, event } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};
