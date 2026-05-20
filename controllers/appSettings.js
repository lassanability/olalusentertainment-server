const AppSettings = require('../models/AppSettings');

exports.get = async (req, res) => {
  try {
    const settings = await AppSettings.findOne();
    res.json({ success: true, data: settings || { listingFee: 20000 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { listingFee } = req.body;
    if (listingFee == null || isNaN(listingFee) || Number(listingFee) < 0) {
      return res.status(400).json({ success: false, message: 'Invalid listing fee' });
    }
    const settings = await AppSettings.findOneAndUpdate(
      {},
      { listingFee: Math.round(Number(listingFee)) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
