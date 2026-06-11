require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Order = require('../models/Order');
const IssuedTicket = require('../models/IssuedTicket');

const TICKET_IDS = [
  'tkt-36a624fd',
  'tkt-c21ac3dd',
  'tkt-acbad73a',
  'tkt-3024839b',
  'tkt-9644780f',
  'tkt-ccfa0cc9',
  'tkt-b9c1587e',
  'tkt-d1ef26e6',
  'tkt-541431dd',
  'tkt-df3b558d',
  'tkt-65aa7c95',
  'tkt-62228d3f',
  'tkt-2a7f5f98',
  'tkt-5986e2d9',
  'tkt-5db8ea77',
];

const ORDER_IDS = [
  'olalus-c1ceb123',
  'olalus-7fddfa5f',
  'olalus-654fa1f4',
  'olalus-6255776f',
  'olalus-21ccbcdb',
  'olalus-f4f57911',
  'olalus-62606039',
  'olalus-847cfdc2',
  'olalus-6fbf04c5',
  'olalus-43ba273e',
  'olalus-23d04a28',
  'olalus-8662c351',
  'olalus-261625e9',
  'olalus-1b36e17e',
  'olalus-b2b32a9c',
  'olalus-f6f498ec',
  'olalus-2aa159ed',
];

async function run() {
  await mongoose.connect(process.env.MONGO_CONNECTION_URL, { dbName: process.env.DB_NAME });
  console.log('Connected to MongoDB');

  const ticketResult = await IssuedTicket.deleteMany({
    $or: [
      { orderId: { $in: ORDER_IDS } },
      { ticketId: { $in: TICKET_IDS } },
    ],
  });
  console.log(`Deleted ${ticketResult.deletedCount} issued ticket(s)`);

  const orderResult = await Order.deleteMany({ orderId: { $in: ORDER_IDS } });
  console.log(`Deleted ${orderResult.deletedCount} order(s)`);

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
