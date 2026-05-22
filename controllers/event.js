const { randomUUID } = require('crypto');
const Event = require('../models/Event');
const AppSettings = require('../models/AppSettings');
const seaweed = require('../config/storage');
const { logActivity } = require('../utils/logger');
const squareClient = require('../services/squareClient');

exports.getAll = async (req, res) => {
  try {
    const filter = { $or: [{ postedBy: 'admin' }, { postedBy: 'user', listingPaid: true }] };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.status) filter.status = req.query.status;
    const events = await Event.find(filter).sort({ startDateTime: 1 });
    res.json({ success: true, events });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
};

exports.getAllAdmin = async (req, res) => {
  try {
    const events = await Event.find({}).sort({ createdAt: -1 });
    res.json({ success: true, events });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
};

exports.getById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, event });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch event' });
  }
};

exports.getFeatured = async (req, res) => {
  try {
    const events = await Event.find({ featured: true, postedBy: 'admin' }).sort({ startDateTime: 1 }).limit(6);
    res.json({ success: true, events });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch featured events' });
  }
};

exports.create = async (req, res) => {
  try {
    const data = { ...req.body };
    data.postedBy = 'admin';
    if (data.ticketTypes && typeof data.ticketTypes === 'string') {
      data.ticketTypes = JSON.parse(data.ticketTypes);
    }
    if (data.tags && typeof data.tags === 'string') {
      data.tags = JSON.parse(data.tags);
    }

    if (req.files?.length) {
      const [first, ...rest] = req.files;
      const ext = first.originalname.split('.').pop();
      const key = `events/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      await seaweed.uploadFile(first.buffer, key, first.mimetype);
      data.image = `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${key}`;

      if (rest.length) {
        const urls = await Promise.all(rest.map(async (f) => {
          const k = `events/${Date.now()}-${Math.random().toString(36).slice(2)}.${f.originalname.split('.').pop()}`;
          await seaweed.uploadFile(f.buffer, k, f.mimetype);
          return `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${k}`;
        }));
        data.images = urls;
      }
    }

    const event = await Event.create(data);
    await logActivity(req.admin, 'create', 'Event', event._id, { title: event.title });
    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create event' });
  }
};

exports.update = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.ticketTypes && typeof data.ticketTypes === 'string') {
      data.ticketTypes = JSON.parse(data.ticketTypes);
    }
    if (data.tags && typeof data.tags === 'string') {
      data.tags = JSON.parse(data.tags);
    }

    if (req.files?.length) {
      const [first, ...rest] = req.files;
      const ext = first.originalname.split('.').pop();
      const key = `events/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      await seaweed.uploadFile(first.buffer, key, first.mimetype);
      data.image = `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${key}`;
      if (rest.length) {
        data.images = await Promise.all(rest.map(async (f) => {
          const k = `events/${Date.now()}-${Math.random().toString(36).slice(2)}.${f.originalname.split('.').pop()}`;
          await seaweed.uploadFile(f.buffer, k, f.mimetype);
          return `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${k}`;
        }));
      }
    }

    const event = await Event.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    await logActivity(req.admin, 'update', 'Event', event._id, { title: event.title });
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update event' });
  }
};

exports.remove = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    await logActivity(req.admin, 'delete', 'Event', event._id, { title: event.title });
    res.json({ success: true, message: 'Event deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to delete event' });
  }
};

exports.getPast = async (req, res) => {
  try {
    const filter = {
      startDateTime: { $lt: new Date() },
      $or: [{ postedBy: 'admin' }, { postedBy: 'user', listingPaid: true }],
    };
    const events = await Event.find(filter).sort({ startDateTime: -1 });
    res.json({ success: true, events });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch past events' });
  }
};

exports.toggleFeatured = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    event.featured = !event.featured;
    await event.save();
    res.json({ success: true, featured: event.featured });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to toggle featured' });
  }
};

exports.submitListing = async (req, res) => {
  try {
    const { title, description, category, startDateTime, venue, address, city, state, posterName, posterEmail, ticketTypes: rawTicketTypes } = req.body;
    if (!title?.trim() || !description?.trim() || !posterEmail?.trim() || !startDateTime) {
      return res.status(400).json({ success: false, message: 'Title, description, email, and date are required' });
    }

    let imageUrl = '';
    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      const key = `events/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      await seaweed.uploadFile(req.file.buffer, key, req.file.mimetype);
      imageUrl = `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${key}`;
    }

    const settings = await AppSettings.findOne();
    const listingFee = settings?.listingFee ?? 20000;

    let ticketTypes = [];
    if (rawTicketTypes) {
      try {
        ticketTypes = JSON.parse(rawTicketTypes);
      } catch { /* ignore malformed */ }
    }

    const event = await Event.create({
      title: title.trim(),
      description: description.trim(),
      category: category || 'other',
      startDateTime: new Date(startDateTime),
      venue: venue?.trim() || '',
      address: address?.trim() || '',
      city: city?.trim() || '',
      state: state?.trim() || '',
      image: imageUrl,
      postedBy: 'user',
      posterName: posterName?.trim() || '',
      posterEmail: posterEmail.trim(),
      listingFee,
      listingPaid: false,
      ticketTypes,
    });

    const listingResponse = await squareClient.checkout.paymentLinks.create({
      idempotencyKey: randomUUID(),
      order: {
        locationId: process.env.SQUARE_LOCATION_ID,
        referenceId: `listing_${event._id}`,
        lineItems: [{
          name: 'Event Listing Fee',
          quantity: '1',
          basePriceMoney: { amount: BigInt(listingFee), currency: 'USD' },
        }],
      },
      checkoutOptions: {
        redirectUrl: `${process.env.FRONTEND_URL}/listing-success?event=${event._id}`,
        allowTipping: false,
      },
      prePopulatedData: {
        buyerEmail: posterEmail.trim(),
      },
    });

    const checkoutUrl = listingResponse.paymentLink?.url;
    if (!checkoutUrl) throw new Error('Failed to create payment link');

    await Event.findByIdAndUpdate(event._id, { listingPaymentId: listingResponse.paymentLink.id });
    res.json({ success: true, checkoutUrl, eventId: event._id });
  } catch (err) {
    console.error('[!] Listing submission error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to process listing' });
  }
};
