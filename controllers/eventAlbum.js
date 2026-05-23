const EventAlbum = require('../models/EventAlbum');
const seaweed = require('../config/storage');

exports.getAll = async (req, res) => {
  try {
    const photos = await EventAlbum.find().sort({ createdAt: -1 });
    res.json({ success: true, photos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { description, eventName } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'Image is required' });
    if (!eventName?.trim()) return res.status(400).json({ success: false, message: 'Event name is required' });

    const ext = req.file.originalname.split('.').pop();
    const key = `album/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await seaweed.uploadFile(req.file.buffer, key, req.file.mimetype);
    const imageUrl = `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${key}`;

    const photo = await EventAlbum.create({
      imageUrl,
      description: description?.trim() || '',
      eventName: eventName.trim(),
    });

    res.status(201).json({ success: true, photo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const photo = await EventAlbum.findById(req.params.id);
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });

    const { description, eventName } = req.body;
    if (description !== undefined) photo.description = description.trim();
    if (eventName !== undefined) photo.eventName = eventName.trim();

    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      const key = `album/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      await seaweed.uploadFile(req.file.buffer, key, req.file.mimetype);
      photo.imageUrl = `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${key}`;
    }

    await photo.save();
    res.json({ success: true, photo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const photo = await EventAlbum.findByIdAndDelete(req.params.id);
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });
    res.json({ success: true, message: 'Photo deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
