require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const QRCode = require('qrcode');
const Event = require('../models/Event');
const Order = require('../models/Order');
const IssuedTicket = require('../models/IssuedTicket');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    file: path.join(__dirname, '../guestlist.xlsx'),
    sheet: 'Staffing',
    event: null,
    out: null,
    dryRun: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--file') opts.file = args[++i];
    else if (a === '--sheet') opts.sheet = args[++i];
    else if (a === '--event') opts.event = args[++i];
    else if (a === '--out') opts.out = args[++i];
    else if (a === '--dry-run') opts.dryRun = true;
  }
  return opts;
}

const normalizeName = (s) => String(s || '').replace(/\s+/g, ' ').trim().toUpperCase();

const slugify = (s) => (
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
) || 'guest';

function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i++) {
    const cell = rows[i] && rows[i][0];
    if (cell && String(cell).trim().toUpperCase().includes('ATTENDEES')) return i;
  }
  return -1;
}

async function resolveEvent(identifier) {
  if (mongoose.isValidObjectId(identifier)) {
    const byId = await Event.findById(identifier);
    if (byId) return byId;
  }
  const matches = await Event.find({ title: { $regex: identifier, $options: 'i' } });
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    console.error(`Multiple events match "${identifier}":`);
    matches.forEach((e) => console.error(`  - ${e._id}  ${e.title}`));
    throw new Error('Ambiguous --event value, pass the exact event ID instead');
  }
  return null;
}

async function run() {
  const opts = parseArgs();

  if (!opts.event) {
    console.error('Usage: node scripts/importGuestlist.js --event "<event id or title match>" [--file guestlist.xlsx] [--sheet Staffing] [--out dir] [--dry-run]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_CONNECTION_URL, { dbName: process.env.DB_NAME });
  console.log('Connected to MongoDB');

  try {
    const event = await resolveEvent(opts.event);
    if (!event) {
      const recent = await Event.find().select('title startDateTime').sort({ startDateTime: -1 }).limit(20);
      console.error(`No event found matching "${opts.event}". Recent events:`);
      recent.forEach((e) => console.error(`  - ${e._id}  ${e.title}`));
      throw new Error('Event not found');
    }
    console.log(`Target event: ${event.title} (${event._id})`);

    if (!fs.existsSync(opts.file)) throw new Error(`Guestlist file not found: ${opts.file}`);

    const workbook = XLSX.readFile(opts.file);
    const sheet = workbook.Sheets[opts.sheet];
    if (!sheet) throw new Error(`Sheet "${opts.sheet}" not found. Available sheets: ${workbook.SheetNames.join(', ')}`);

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
    const headerIdx = findHeaderRow(rows);
    if (headerIdx === -1) throw new Error('Could not find header row (expected a column starting with "ATTENDEES")');
    const dataRows = rows.slice(headerIdx + 1);

    const existingTickets = await IssuedTicket.find({ eventId: event._id }).select('buyerName');
    const existingNames = new Set(existingTickets.map((t) => normalizeName(t.buyerName)));

    const outDir = opts.out || path.join(__dirname, 'output', slugify(event.title));
    if (!opts.dryRun) fs.mkdirSync(outDir, { recursive: true });

    const seenInFile = new Set();
    const summary = [];
    let skippedBlank = 0;
    let skippedDupFile = 0;
    let skippedDupDb = 0;
    let created = 0;

    for (const row of dataRows) {
      const rawName = row[0];
      const table = row[2] ? String(row[2]).trim() : '';

      const name = normalizeName(rawName);
      if (!name) { skippedBlank++; continue; }
      if (seenInFile.has(name)) { skippedDupFile++; continue; }
      seenInFile.add(name);
      if (existingNames.has(name)) { skippedDupDb++; continue; }

      const displayName = String(rawName).replace(/\s+/g, ' ').trim();
      const ticketTypeName = table ? `Guestlist (${table})` : 'Guestlist';
      const orderId = `olalus-guestlist-${crypto.randomBytes(4).toString('hex')}`;

      let ticketId = null;

      if (!opts.dryRun) {
        const order = await Order.create({
          orderId,
          buyerEmail: 'guestlist@olalusentertainment.com',
          buyerName: displayName,
          eventId: event._id,
          eventName: event.title,
          ticketTypeName,
          ticketCount: 1,
          amount: 0,
          paymentMethod: 'manual',
          status: 'paid',
          paidAt: new Date(),
        });

        const ticket = await IssuedTicket.create({
          orderId: order.orderId,
          eventId: event._id,
          eventName: event.title,
          buyerEmail: order.buyerEmail,
          buyerName: displayName,
          ticketTypeName,
          qrCodeData: JSON.stringify({ orderId: order.orderId, eventName: event.title, buyer: displayName, table }),
        });
        ticketId = ticket.ticketId;

        await Order.findOneAndUpdate({ orderId: order.orderId }, { ticketIds: [ticketId] });

        const qrBuffer = await QRCode.toBuffer(ticketId, { type: 'png', width: 200, margin: 2 });
        fs.writeFileSync(path.join(outDir, `${ticketId}-${slugify(displayName)}.png`), qrBuffer);
      }

      created++;
      summary.push({ name: displayName, table, orderId, ticketId });
    }

    if (!opts.dryRun && summary.length) {
      const csv = ['name,table,orderId,ticketId']
        .concat(summary.map((s) => `"${s.name.replace(/"/g, '""')}",${s.table},${s.orderId},${s.ticketId}`))
        .join('\n');
      fs.writeFileSync(path.join(outDir, '_summary.csv'), csv);
    }

    console.log('---');
    console.log(`Rows read:           ${dataRows.length}`);
    console.log(`Blank name skipped:  ${skippedBlank}`);
    console.log(`Duplicate in file:   ${skippedDupFile}`);
    console.log(`Already imported:    ${skippedDupDb}`);
    console.log(`${opts.dryRun ? 'Would create' : 'Created'}:         ${created}`);
    if (!opts.dryRun) console.log(`QR codes + summary CSV written to: ${outDir}`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
