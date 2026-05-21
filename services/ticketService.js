const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const Order = require('../models/Order');
const IssuedTicket = require('../models/IssuedTicket');

const EMAIL_FROM = `"Olalus Entertainment" <${process.env.EMAIL_USER || ''}>`;

const escape = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
  await transporter.sendMail({ from: EMAIL_FROM, to, subject, html, attachments });
};

const issueTickets = async (order) => {
  const ticketIds = [];
  const ticketCards = [];
  const attachments = [];

  for (let i = 0; i < order.ticketCount; i++) {
    const ticket = await IssuedTicket.create({
      orderId: order.orderId,
      eventId: order.eventId,
      eventName: order.eventName,
      buyerEmail: order.buyerEmail,
      buyerName: order.buyerName,
      ticketTypeName: order.ticketTypeName,
      qrCodeData: JSON.stringify({
        orderId: order.orderId,
        eventName: order.eventName,
        buyer: order.buyerName,
        seat: i + 1,
      }),
    });

    ticketIds.push(ticket.ticketId);

    const qrBuffer = await QRCode.toBuffer(ticket.ticketId, { type: 'png', width: 200, margin: 2 });
    const cid = `qr_${ticket.ticketId}`;
    attachments.push({
      filename: `ticket-${ticket.ticketId}.png`,
      content: qrBuffer,
      contentType: 'image/png',
      cid,
    });
    ticketCards.push({ ticketId: ticket.ticketId, seat: i + 1, cid });
  }

  await Order.findOneAndUpdate(
    { orderId: order.orderId },
    { ticketIds, status: 'paid', paidAt: new Date() }
  );

  try {
    const SITE_URL = process.env.WEBSITE || 'https://olalusentertainment.com';
    const _d = order.eventDate ? new Date(order.eventDate) : null;
    const eventDate = _d
      ? `${String(_d.getDate()).padStart(2, '0')}•${String(_d.getMonth() + 1).padStart(2, '0')}•${_d.getFullYear()}`
      : '—';
    const category = (order.eventCategory || order.ticketTypeName || 'Event').toUpperCase();

    const ticketBlocks = ticketCards.map(({ ticketId, cid }) => `
      <div class="ticket">
        <div class="ticket-stripe">
          <span class="ticket-category">${escape(category)}</span>
        </div>
        <div class="ticket-main">
          <p class="ticket-event-name">${escape(order.eventName)}</p>
          <div class="ticket-fields">
            <div class="ticket-field">
              <span class="ticket-field-label">Name</span>
              <span class="ticket-field-value">${escape(order.buyerName.toUpperCase())}</span>
            </div>
            <div class="ticket-field">
              <span class="ticket-field-label">Date</span>
              <span class="ticket-field-value">${escape(eventDate)}</span>
            </div>
          </div>
          ${order.eventAddress ? `<span class="ticket-addr-label">Event Address</span><div class="ticket-addr-box">${escape(order.eventAddress)}</div>` : ''}
        </div>
        <div class="ticket-qr">
          <p class="ticket-qr-label">Scan to check in</p>
          <img src="cid:${cid}" width="130" height="130" alt="QR Code" />
          <p class="ticket-qr-id">ID ${escape(ticketId)}</p>
        </div>
      </div>
    `).join('');

    const templatePath = path.join(__dirname, '../client/ticketConfirmation.html');
    let html = fs.readFileSync(templatePath, 'utf-8');

    const replacements = {
      buyerName: escape(order.buyerName),
      eventName: escape(order.eventName),
      orderId: escape(order.orderId),
      amountPaid: (order.amount / 100).toFixed(2),
      eventDate: escape(eventDate),
      ticketBlocks,
      confirmUrl: `${SITE_URL}/payment/confirm?order=${encodeURIComponent(order.orderId)}`,
      browseUrl: `${SITE_URL}/tickets`,
      websiteUrl: SITE_URL,
      supportEmail: escape(process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || ''),
      year: new Date().getFullYear(),
    };

    for (const [key, value] of Object.entries(replacements)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    await sendEmail({
      to: order.buyerEmail,
      subject: `Your Tickets for ${order.eventName} — Olalus Entertainment`,
      html,
      attachments,
    });
  } catch (err) {
    console.error('[!] Failed to send ticket email:', err.message);
  }

  return ticketIds;
};

module.exports = { issueTickets };
