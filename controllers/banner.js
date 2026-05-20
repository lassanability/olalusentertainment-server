const Banner = require('../models/banner');
const storage = require('../config/storage');

const getImageUrl = (key) => {
  if (!key) return null;
  if (key.startsWith('http')) return key;
  return `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${key}`;
};

exports.get = async (req, res) => {
  try {
    let home = await Banner.findOne();
    if (!home) home = await Banner.create({});
    res.json({ success: true, data: home });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    let home = await Banner.findOne();
    if (!home) home = new Banner();

    const { title, description, tagline, statsEventsCount, statsEventsLabel, statsTicketsCount, statsTicketsLabel } = req.body;
    if (title !== undefined) home.title = title;
    if (description !== undefined) home.description = description;
    if (tagline !== undefined) home.tagline = tagline;
    if (statsEventsCount !== undefined) home.statsEventsCount = statsEventsCount;
    if (statsEventsLabel !== undefined) home.statsEventsLabel = statsEventsLabel;
    if (statsTicketsCount !== undefined) home.statsTicketsCount = statsTicketsCount;
    if (statsTicketsLabel !== undefined) home.statsTicketsLabel = statsTicketsLabel;

    const files = req.files || {};
    if (files.heroImage?.[0]) {
      const f = files.heroImage[0];
      const key = `home/${Date.now()}-hero-${f.originalname.replace(/\s+/g, '-')}`;
      await storage.uploadFile(f.buffer, key, f.mimetype);
      home.heroImage = getImageUrl(key);
    }
    if (files.blobImage?.[0]) {
      const f = files.blobImage[0];
      const key = `home/${Date.now()}-blob-${f.originalname.replace(/\s+/g, '-')}`;
      await storage.uploadFile(f.buffer, key, f.mimetype);
      home.blobImage = getImageUrl(key);
    }

    await home.save();
    res.json({ success: true, data: home });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
