const crypto = require('crypto');
const Order = require('../models/Order');
const Event = require('../models/Event');
const { issueTickets } = require('../services/ticketService');

exports.handleSquare = async (req, res) => {
  const signature = req.headers['x-square-hmacsha256-signature'];
  const notificationUrl = process.env.SQUARE_WEBHOOK_URL;
  const body = req.body.toString('utf8');

  if (signature && notificationUrl && process.env.SQUARE_WEBHOOK_SIGNATURE_KEY) {
    const expected = crypto
      .createHmac('sha256', process.env.SQUARE_WEBHOOK_SIGNATURE_KEY)
      .update(notificationUrl + body)
      .digest('base64');

    if (signature !== expected) {
      console.warn('[!] Invalid Square webhook signature');
      return res.status(401).send('Invalid signature');
    }
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return res.status(400).send('Bad JSON');
  }

  console.log('[+] Square webhook:', event.type);

  try {
    if (event.type === 'payment.updated') {
      const payment = event.data?.object?.payment;
      if (!payment) return res.status(200).send('OK');

      const orderId = payment.reference_id;

      if (orderId?.startsWith('listing_')) {
        if (payment.status === 'COMPLETED') {
          const eventId = orderId.replace('listing_', '');
          await Event.findByIdAndUpdate(eventId, { listingPaid: true });
        }
        return res.status(200).send('OK');
      }

      const order = await Order.findOne({ orderId });
      if (!order) return res.status(200).send('OK');

      if (payment.status === 'COMPLETED' && order.status !== 'paid') {
        const eventDoc = await Event.findById(order.eventId).select('startDateTime address venue city state category').lean();
        const eventAddress = eventDoc ? [eventDoc.address, eventDoc.venue, eventDoc.city, eventDoc.state].filter(Boolean).join(', ') : '';
        await issueTickets({
          ...order.toObject(),
          eventDate: eventDoc?.startDateTime,
          eventAddress,
          eventCategory: eventDoc?.category,
        });
        await Event.findOneAndUpdate(
          { _id: order.eventId, 'ticketTypes._id': order.ticketTypeId },
          { $inc: { 'ticketTypes.$.sold': order.ticketCount } }
        );
      } else if (payment.status === 'FAILED' || payment.status === 'CANCELED') {
        await Order.findOneAndUpdate(
          { orderId },
          { status: 'failed', failureReason: payment.status }
        );
      }
    }
  } catch (err) {
    console.error('[!] Webhook processing error:', err.message);
  }

  res.status(200).send('OK');
};
