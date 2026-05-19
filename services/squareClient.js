const { Client, Environment } = require('square');

BigInt.prototype.toJSON = function () { return this.toString(); };

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment:
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? Environment.Production
      : Environment.Sandbox,
});

module.exports = client;
