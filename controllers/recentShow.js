const fs = require('fs');
const RecentShow = require('../models/RecentShow');
const storage = require('../config/storage');

const getUrl = (key) => {
  if (!key) return null;
  if (key.startsWith('http')) return key;
  return `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${key}`;
};

const cleanupFiles = (files) => {
  for (const f of files) {
    try { fs.unlinkSync(f); } catch {}
  }
};

exports.getAll = async (req, res) => {
  try {
    const shows = await RecentShow.find().sort({ order: 1, createdAt: -1 });
    res.json({ success: true, shows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  const tempFiles = [];
  try {
    const { title, description, order } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });

    const media = req.files?.media?.[0];
    const thumb = req.files?.thumbnail?.[0];

    if (!media) return res.status(400).json({ success: false, message: 'Media file is required' });
    if (media.path) tempFiles.push(media.path);
    if (thumb?.path) tempFiles.push(thumb.path);

    const isVideo = media.mimetype.startsWith('video/');
    const ext = media.originalname.split('.').pop();
    const key = `shows/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    await storage.uploadFileFromPath(media.path, key, media.mimetype);
    const mediaUrl = getUrl(key);

    let thumbnail = '';
    if (thumb) {
      const tKey = `shows/thumb-${Date.now()}.${thumb.originalname.split('.').pop()}`;
      await storage.uploadFileFromPath(thumb.path, tKey, thumb.mimetype);
      thumbnail = getUrl(tKey);
    }

    const show = await RecentShow.create({
      title: title.trim(),
      description: description?.trim() || '',
      mediaUrl,
      mediaType: isVideo ? 'video' : 'image',
      thumbnail,
      order: Number(order) || 0,
    });

    res.status(201).json({ success: true, show });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    cleanupFiles(tempFiles);
  }
};

exports.update = async (req, res) => {
  const tempFiles = [];
  try {
    const show = await RecentShow.findById(req.params.id);
    if (!show) return res.status(404).json({ success: false, message: 'Show not found' });

    const { title, description, order } = req.body;
    if (title !== undefined) show.title = title.trim();
    if (description !== undefined) show.description = description.trim();
    if (order !== undefined) show.order = Number(order);

    const media = req.files?.media?.[0];
    const thumb = req.files?.thumbnail?.[0];

    if (media?.path) tempFiles.push(media.path);
    if (thumb?.path) tempFiles.push(thumb.path);

    if (media) {
      const isVideo = media.mimetype.startsWith('video/');
      const ext = media.originalname.split('.').pop();
      const key = `shows/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      await storage.uploadFileFromPath(media.path, key, media.mimetype);
      show.mediaUrl = getUrl(key);
      show.mediaType = isVideo ? 'video' : 'image';
    }
    if (thumb) {
      const tKey = `shows/thumb-${Date.now()}.${thumb.originalname.split('.').pop()}`;
      await storage.uploadFileFromPath(thumb.path, tKey, thumb.mimetype);
      show.thumbnail = getUrl(tKey);
    }

    await show.save();
    res.json({ success: true, show });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    cleanupFiles(tempFiles);
  }
};

exports.remove = async (req, res) => {
  try {
    const show = await RecentShow.findByIdAndDelete(req.params.id);
    if (!show) return res.status(404).json({ success: false, message: 'Show not found' });
    res.json({ success: true, message: 'Show deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
