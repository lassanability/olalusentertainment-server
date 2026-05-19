const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const Order = require('../models/Order');
const IssuedTicket = require('../models/IssuedTicket');

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });
  await transporter.sendMail({ from: `"Olalus Entertainment" <${process.env.EMAIL_USER}>`, to, subject, html });
};

const issueTickets = async (order) => {
  const ticketIds = [];
  const ticketCards = [];

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

    const qrDataUrl = await QRCode.toDataURL(ticket.ticketId, { width: 200, margin: 2 });
    ticketCards.push({ ticketId: ticket.ticketId, seat: i + 1, qrDataUrl });
  }

  await Order.findOneAndUpdate(
    { orderId: order.orderId },
    { ticketIds, status: 'paid', paidAt: new Date() }
  );

  try {
    const SITE_URL = process.env.WEBSITE || 'https://olalusentertainment.com';
    const eventDate = order.eventDate
      ? new Date(order.eventDate).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '—';
    const category = (order.eventCategory || order.ticketTypeName || 'Event').toUpperCase();

    const ticketBlocksHtml = ticketCards.map(({ ticketId, seat, qrDataUrl }) => `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f8f9fb;border-radius:12px;overflow:hidden;margin:16px 0;box-shadow:0 4px 24px rgba(0,0,0,0.15);">
        <tr>
          <td bgcolor="#0f1629" width="44" style="background:#0f1629;width:44px;vertical-align:middle;text-align:center;padding:24px 8px;">
            <span style="font-family:Arial,Helvetica,sans-serif;display:block;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:2px;text-transform:uppercase;writing-mode:vertical-lr;-webkit-writing-mode:vertical-lr;transform:rotate(180deg);-webkit-transform:rotate(180deg);">${category}</span>
          </td>
          <td bgcolor="#ffffff" style="background:#ffffff;padding:24px 20px;vertical-align:top;">
            <h2 style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;color:#0f1629;letter-spacing:1px;text-transform:uppercase;line-height:1.2;">${order.eventName}</h2>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:14px;">
              <tr>
                <td style="padding-right:12px;vertical-align:top;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background:#ebebeb;border-radius:8px;">
                    <tr><td style="padding:8px 16px;">
                      <span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#888888;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">Name</span>
                      <strong style="font-family:'Courier New',Courier,monospace;font-size:13px;color:#0f1629;font-weight:700;">${order.buyerName.toUpperCase()}</strong>
                    </td></tr>
                  </table>
                </td>
                <td style="vertical-align:top;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background:#ebebeb;border-radius:8px;">
                    <tr><td style="padding:8px 16px;">
                      <span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#888888;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">Date</span>
                      <strong style="font-family:'Courier New',Courier,monospace;font-size:13px;color:#0f1629;font-weight:700;">${eventDate}</strong>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
            ${order.eventAddress ? `
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#888888;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:6px;">Event Address</span>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#ebebeb;border-radius:8px;">
              <tr><td style="padding:10px 16px;font-family:'Courier New',Courier,monospace;font-size:13px;color:#0f1629;font-weight:700;">${order.eventAddress}</td></tr>
            </table>` : ''}
          </td>
          <td bgcolor="#f8fafc" style="background:#f8fafc;width:160px;padding:24px 16px;vertical-align:middle;text-align:center;border-left:2px dashed #c8cdd6;">
            <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#888888;font-weight:600;letter-spacing:0.5px;">Scan to check in</p>
            <img src="${qrDataUrl}" width="120" height="120" alt="QR Code" style="display:block;margin:0 auto;border-radius:4px;" />
            <p style="margin:10px 0 0;font-family:'Courier New',Courier,monospace;font-size:9px;color:#888888;text-align:center;word-break:break-all;">ID ${ticketId}</p>
          </td>
        </tr>
      </table>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Your Tickets — Olalus Entertainment</title>
</head>
<body style="margin:0;padding:0;background-color:#060a18;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#060a18;">
  <tr>
    <td align="center" style="padding:20px 10px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td bgcolor="#080c1a" style="background-color:#080c1a;border-bottom:1px solid rgba(209,158,29,0.25);padding:18px 32px;text-align:center;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td align="center" style="padding-bottom:12px;">
                  <span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;color:#d19e1d;letter-spacing:1px;">OLALUS</span><span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:1px;"> ENTERTAINMENT</span>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <a href="${SITE_URL}" style="font-family:Arial,Helvetica,sans-serif;color:#94a3b8;text-decoration:none;font-size:12px;margin:0 10px;">Home</a>
                  <a href="${SITE_URL}/about" style="font-family:Arial,Helvetica,sans-serif;color:#94a3b8;text-decoration:none;font-size:12px;margin:0 10px;">About Us</a>
                  <a href="${SITE_URL}/tickets" style="font-family:Arial,Helvetica,sans-serif;color:#d19e1d;text-decoration:none;font-size:12px;margin:0 10px;">Tickets</a>
                  <a href="${SITE_URL}/blog" style="font-family:Arial,Helvetica,sans-serif;color:#94a3b8;text-decoration:none;font-size:12px;margin:0 10px;">Blog</a>
                  <a href="${SITE_URL}/contact" style="font-family:Arial,Helvetica,sans-serif;color:#94a3b8;text-decoration:none;font-size:12px;margin:0 10px;">Contact</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td bgcolor="#0f1629" style="background:linear-gradient(135deg,#0f1629 0%,#1a2540 100%);padding:40px 32px 32px;text-align:center;border-bottom:1px solid rgba(209,158,29,0.15);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td align="center" style="padding-bottom:14px;">
                  <span style="font-family:Arial,Helvetica,sans-serif;display:inline-block;background:rgba(209,158,29,0.12);border:1px solid rgba(209,158,29,0.35);border-radius:50px;padding:6px 18px;color:#ffd86e;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">&#10003; Booking Confirmed</span>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <h1 style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;">Your Tickets Are Ready!</h1>
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#94a3b8;">Hi <strong style="color:#ffffff;">${order.buyerName}</strong>, your payment was successful.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Order summary -->
        <tr>
          <td bgcolor="#060a18" style="background-color:#060a18;padding:24px 32px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#0f1629" style="background:#0f1629;border-radius:10px;border:1px solid rgba(255,255,255,0.07);">
              <tr>
                <td style="padding:18px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="padding:4px 20px 4px 0;vertical-align:top;">
                        <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;">Event</p>
                        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;">${order.eventName}</p>
                      </td>
                      <td style="padding:4px 20px 4px 0;vertical-align:top;">
                        <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;">Order ID</p>
                        <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;color:#ffd86e;">${order.orderId}</p>
                      </td>
                      <td style="padding:4px 0;vertical-align:top;">
                        <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;">Amount Paid</p>
                        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:800;color:#4ade80;">$${(order.amount / 100).toFixed(2)}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Tickets section -->
        <tr>
          <td bgcolor="#060a18" style="background-color:#060a18;padding:24px 32px 8px;">
            <h2 style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;">Your QR Tickets</h2>
            <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748b;">Present each QR code at the event entrance for admission.</p>
          </td>
        </tr>

        <tr>
          <td bgcolor="#060a18" style="background-color:#060a18;padding:0 32px;">
            ${ticketBlocksHtml}
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td bgcolor="#060a18" style="background-color:#060a18;padding:24px 32px 32px;text-align:center;">
            <a href="${SITE_URL}/tickets" style="font-family:Arial,Helvetica,sans-serif;display:inline-block;background:linear-gradient(135deg,#ffd86e,#d19e1d);color:#111827;text-decoration:none;font-weight:700;font-size:13px;padding:14px 36px;border-radius:50px;letter-spacing:0.5px;">Browse More Events</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="#080c1a" style="background-color:#080c1a;border-top:1px solid rgba(255,255,255,0.07);padding:24px 32px;text-align:center;">
            <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#475569;">Follow us on social media for event updates</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td align="center" style="padding-bottom:16px;">
                  <a href="https://twitter.com/olalusentertainment" style="font-family:Arial,Helvetica,sans-serif;color:#94a3b8;text-decoration:none;font-size:12px;margin:0 8px;">Twitter</a>
                  <a href="https://www.tiktok.com/@olalusentertainment" style="font-family:Arial,Helvetica,sans-serif;color:#94a3b8;text-decoration:none;font-size:12px;margin:0 8px;">TikTok</a>
                  <a href="https://www.facebook.com/olalusentertainment" style="font-family:Arial,Helvetica,sans-serif;color:#94a3b8;text-decoration:none;font-size:12px;margin:0 8px;">Facebook</a>
                  <a href="https://www.instagram.com/olalusentertainment" style="font-family:Arial,Helvetica,sans-serif;color:#94a3b8;text-decoration:none;font-size:12px;margin:0 8px;">Instagram</a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#334155;">&copy; ${new Date().getFullYear()} Olalus Entertainment. All Rights Reserved.</p>
            <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#334155;">
              <a href="${SITE_URL}/privacy-policy" style="color:#475569;text-decoration:none;">Privacy Policy</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

    await sendEmail({
      to: order.buyerEmail,
      subject: `Your Tickets for ${order.eventName} — Olalus Entertainment`,
      html,
    });
  } catch (err) {
    console.error('[!] Failed to send ticket email:', err.message);
  }

  return ticketIds;
};

module.exports = { issueTickets };
