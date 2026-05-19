const About = require('../models/about');
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

    const { aboutHeading, introParagraph, checkItems, statsCareTakers, statsYears, statsTicketsSold, missionHeading, missionParagraphs, visionHeading, visionBullets, branches, appointmentFeatures, imageField } = req.body;

    if (aboutHeading !== undefined) about.aboutHeading = aboutHeading;
    if (introParagraph !== undefined) about.introParagraph = introParagraph;
    if (statsCareTakers !== undefined) about.statsCareTakers = statsCareTakers;
    if (statsYears !== undefined) about.statsYears = statsYears;
    if (statsTicketsSold !== undefined) about.statsTicketsSold = statsTicketsSold;
    if (checkItems !== undefined) {
      about.checkItems = Array.isArray(checkItems) ? checkItems : JSON.parse(checkItems);
    }
    if (missionHeading !== undefined) about.missionHeading = missionHeading;
    if (missionParagraphs !== undefined) {
      about.missionParagraphs = Array.isArray(missionParagraphs)
        ? missionParagraphs
        : JSON.parse(missionParagraphs);
    }
    if (visionHeading !== undefined) about.visionHeading = visionHeading;
    if (visionBullets !== undefined) {
      about.visionBullets = Array.isArray(visionBullets)
        ? visionBullets
        : JSON.parse(visionBullets);
    }
    if (branches !== undefined) {
      about.branches = Array.isArray(branches) ? branches : JSON.parse(branches);
    }
    if (appointmentFeatures !== undefined) {
      about.appointmentFeatures = Array.isArray(appointmentFeatures) ? appointmentFeatures : JSON.parse(appointmentFeatures);
    }

    if (req.file && imageField) {
      const key = `about/${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`;
      await storage.uploadFile(req.file.buffer, key, req.file.mimetype);
      const url = getImageUrl(key);
      const validImageFields = ['overviewImage', 'missionImage', 'visionImage', 'appointmentAvatar'];
      if (validImageFields.includes(imageField)) {
        about[imageField] = url;
        about.markModified(imageField);
      }
    }

    await about.save();
    res.json({ success: true, data: about });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
