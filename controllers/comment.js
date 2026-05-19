const Comment = require('../models/comment');
const { logActivity } = require('../utils/logger');

exports.submit = async (req, res) => {
  try {
    const { name, email, rating, comment, relationship } = req.body;
    if (!name || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'Name, rating, and comment are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const newComment = await Comment.create({
      name, email, rating: Number(rating), comment, relationship,
      status: 'pending',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    res.status(201).json({ success: true, message: 'Thank you! Your comment is under review and will be published if approved.', data: { id: newComment._id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getApproved = async (req, res) => {
  try {
    const comments = await Comment.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: comments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const result = await Comment.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, count: { $sum: 1 }, totalRating: { $sum: '$rating' } } },
    ]);
    const { count = 0, totalRating = 0 } = result[0] || {};
    const averageRating = count > 0 ? Math.round((totalRating / count) * 10) / 10 : 0;
    res.json({ success: true, data: { count, averageRating } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const comments = await Comment.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: comments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const c = await Comment.findById(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Comment not found' });

    c.status = 'approved';
    c.expiresAt = undefined;
    await c.save();

    await logActivity(req.admin, 'approve', 'comment', String(c._id), `Approved comment by ${c.name}`);

    res.json({ success: true, data: c });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const c = await Comment.findByIdAndDelete(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Comment not found' });

    await logActivity(req.admin, 'reject', 'comment', String(req.params.id), `Rejected comment by ${c.name}`);

    res.json({ success: true, message: 'Comment rejected and deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
