const Subscriber = require('../models/subscriber');
const { sendSubscriptionConfirmationEmail, sendNewsletterEmails } = require('../helpers/email');

exports.subscribe = async (req, res) => {
  try {
    const { email, name, phone } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const existing = await Subscriber.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ success: false, message: 'This email is already subscribed' });

    await Subscriber.create({
      email: email.toLowerCase(),
      name: name?.trim() || '',
      phone: phone?.trim() || '',
    });

    sendSubscriptionConfirmationEmail(email).catch(err =>
      console.error('[email] subscription confirmation error:', err.message)
    );

    res.status(201).json({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const subscriber = await Subscriber.findOneAndDelete({ email: email.toLowerCase() });
    if (!subscriber) return res.status(404).json({ success: false, message: 'Email not found in subscribers list' });

    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 });
    res.json({ success: true, data: subscribers, total: subscribers.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendBulk = async (req, res) => {
  try {
    const { subject, message, emails: customEmails } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }

    let emails;
    if (Array.isArray(customEmails) && customEmails.length > 0) {
      emails = customEmails;
    } else {
      const subscribers = await Subscriber.find();
      if (subscribers.length === 0) {
        return res.json({ success: true, message: 'No subscribers to send to', sent: 0 });
      }
      emails = subscribers.map(s => s.email);
    }

    const sent = await sendNewsletterEmails(emails, subject, message);
    res.json({ success: true, message: `Email sent to ${sent.length} recipient(s)`, sent: sent.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
