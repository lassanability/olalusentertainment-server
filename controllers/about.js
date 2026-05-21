const About = require('../models/About');
const storage = require('../config/storage');

const getImageUrl = (key) => {
  if (!key) return null;
  if (key.startsWith('http')) return key;
  return `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${key}`;
};

exports.get = async (req, res) => {
  try {
    let about = await About.findOne();
    if (!about) about = await About.create({});
    res.json({ success: true, data: about });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    let about = await About.findOne();
    if (!about) about = new About();

    const { title, introParagraph } = req.body;
    if (title !== undefined) about.title = title;
    if (introParagraph !== undefined) about.introParagraph = introParagraph;

    const overviewFile = req.files?.image?.[0];
    const howToFile = req.files?.howToImage?.[0];

    if (overviewFile) {
      const key = `about/${Date.now()}-${overviewFile.originalname.replace(/\s+/g, '-')}`;
      await storage.uploadFile(overviewFile.buffer, key, overviewFile.mimetype);
      about.overviewImage = getImageUrl(key);
    }
    if (howToFile) {
      const key = `about/howto-${Date.now()}-${howToFile.originalname.replace(/\s+/g, '-')}`;
      await storage.uploadFile(howToFile.buffer, key, howToFile.mimetype);
      about.howToImage = getImageUrl(key);
    }

    await about.save();
    res.json({ success: true, data: about });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
