const { SquareClient, SquareEnvironment } = require('square');

BigInt.prototype.toJSON = function () { return Number(this); };

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment:
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
});

module.exports = client;
