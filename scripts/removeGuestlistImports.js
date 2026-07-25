require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Order = require('../models/Order');
const IssuedTicket = require('../models/IssuedTicket');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { event: null, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--event') opts.event = args[++i];
    else if (a === '--dry-run') opts.dryRun = true;
  }
  return opts;
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

  await mongoose.connect(process.env.MONGO_CONNECTION_URL, { dbName: process.env.DB_NAME });
  console.log('Connected to MongoDB');

  try {
    // Every guestlist import (old and new run) uses an orderId starting with
    // "olalus-guestlist" — real Square orders are "olalus-<hex>" and admin-approved
    // manual orders are "olalus-manual-<hex>", so this prefix only ever matches
    // guestlist-imported records.
    const filter = { orderId: { $regex: '^olalus-guestlist' } };

    if (opts.event) {
      const event = await resolveEvent(opts.event);
      if (!event) throw new Error(`No event found matching "${opts.event}"`);
      console.log(`Scoping to event: ${event.title} (${event._id})`);
      filter.eventId = event._id;
    }

    const orderCount = await Order.countDocuments(filter);
    const ticketCount = await IssuedTicket.countDocuments(filter);
    console.log(`Matched ${orderCount} order(s) and ${ticketCount} issued ticket(s)`);

    if (opts.dryRun) {
      console.log('Dry run — nothing deleted.');
      return;
    }

    const ticketResult = await IssuedTicket.deleteMany(filter);
    console.log(`Deleted ${ticketResult.deletedCount} issued ticket(s)`);

    const orderResult = await Order.deleteMany(filter);
    console.log(`Deleted ${orderResult.deletedCount} order(s)`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
