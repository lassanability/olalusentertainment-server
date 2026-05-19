const Testimonial = require('../models/testimonial');
const storage = require('../config/storage');

const getImageUrl = (key) => {
  if (!key) return null;
  if (key.startsWith('http')) return key;
  return `${process.env.SEAWEED_S3_URL}/${process.env.SEAWEED_BUCKET}/${key}`;
};

exports.getAll = async (req, res) => {
  try {
    const query = req.query.active === 'true' ? { active: true } : {};
    const testimonials = await Testimonial.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: testimonials });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found' });
    res.json({ success: true, data: testimonial });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, content, rating, position, active } = req.body;
    let imageUrl = '';

    if (req.file) {
      const key = `testimonials/${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`;
      await storage.uploadFile(req.file.buffer, key, req.file.mimetype);
      imageUrl = getImageUrl(key);
    }

    const testimonial = await Testimonial.create({ name, content, rating: Number(rating) || 5, image: imageUrl, position, active });
    res.status(201).json({ success: true, data: testimonial });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found' });

    const { name, content, rating, position, active } = req.body;
    if (name !== undefined) testimonial.name = name;
    if (content !== undefined) testimonial.content = content;
    if (rating !== undefined) testimonial.rating = Number(rating);
    if (position !== undefined) testimonial.position = position;
    if (active !== undefined) testimonial.active = active === 'true' || active === true;

    if (req.file) {
      const key = `testimonials/${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`;
      await storage.uploadFile(req.file.buffer, key, req.file.mimetype);
      testimonial.image = getImageUrl(key);
    }

    await testimonial.save();
    res.json({ success: true, data: testimonial });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitPublic = async (req, res) => {
  try {
    const { name, content, rating, position } = req.body;
    if (!name || !content) return res.status(400).json({ success: false, message: 'Name and review are required' });
    let imageUrl = '';
    if (req.file) {
      const key = `testimonials/${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`;
      await storage.uploadFile(req.file.buffer, key, req.file.mimetype);
      imageUrl = getImageUrl(key);
    }
    await Testimonial.create({ name, content, rating: Number(rating) || 5, image: imageUrl, position, active: false });
    res.status(201).json({ success: true, message: 'Thank you! Your testimonial has been submitted for review.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found' });
    res.json({ success: true, message: 'Testimonial deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
