const ContactInfo = require('../models/contactInfo');

exports.get = async (req, res) => {
  try {
    const info = await ContactInfo.findOne();
    res.json({ success: true, data: info || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { phone, email, address, location, instagramUrl, twitterUrl, facebookUrl, tiktokUrl, youtubeUrl } = req.body;
    const info = await ContactInfo.findOneAndUpdate(
      {},
      { phone, email, address, location, instagramUrl, twitterUrl, facebookUrl, tiktokUrl, youtubeUrl },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: info });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
