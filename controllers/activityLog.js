const ActivityLog = require('../models/activityLog');

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 50, resource, action } = req.query;
    const filter = {};
    if (resource) filter.resource = resource;
    if (action) filter.action = action;

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({ success: true, data: logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
