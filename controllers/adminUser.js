const bcrypt = require('bcrypt');
const AdminUser = require('../models/adminUser');
const { logActivity } = require('../utils/logger');

const DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'chicken@12345';
const SUPER_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();

exports.getAll = async (req, res) => {
  try {
    const admins = await AdminUser.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: admins });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { email, name, roles } = req.body;
    if (!email || !name) {
      return res.status(400).json({ success: false, message: 'Email and name are required' });
    }

    const existing = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An admin with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    const admin = await AdminUser.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      roles: Array.isArray(roles) ? roles : [],
      isSuperAdmin: false,
      passwordChangedFromDefault: false,
    });

    await logActivity(
      req.admin, 'create', 'adminUser', String(admin._id),
      `Created admin: ${email} with roles: ${admin.roles.join(', ') || 'none'}`
    );

    const { password: _, ...adminData } = admin.toObject();
    res.status(201).json({ success: true, data: adminData, message: `Admin created. Default password: ${DEFAULT_PASSWORD}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    if (admin.email === SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: 'Super admin cannot be modified via this route' });
    }

    const { name, roles, isActive } = req.body;
    if (name !== undefined) admin.name = name;
    if (Array.isArray(roles)) admin.roles = roles;
    if (isActive !== undefined) admin.isActive = isActive === true || isActive === 'true';

    await admin.save();

    await logActivity(
      req.admin, 'update', 'adminUser', String(admin._id),
      `Updated admin: ${admin.email} — roles: ${admin.roles.join(', ') || 'none'}, active: ${admin.isActive}`
    );

    const { password: _, ...adminData } = admin.toObject();
    res.json({ success: true, data: adminData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    if (admin.isSuperAdmin || admin.email === SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: 'Super admin cannot be deleted' });
    }

    await AdminUser.findByIdAndDelete(req.params.id);

    await logActivity(
      req.admin, 'delete', 'adminUser', String(req.params.id),
      `Deleted admin: ${admin.email}`
    );

    res.json({ success: true, message: 'Admin deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    if (admin.isSuperAdmin) return res.status(403).json({ success: false, message: 'Cannot reset super admin password via this route' });

    admin.password = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    admin.passwordChangedFromDefault = false;
    await admin.save();

    await logActivity(
      req.admin, 'update', 'adminUser', String(admin._id),
      `Reset password for: ${admin.email}`
    );

    res.json({ success: true, message: `Password reset to default: ${DEFAULT_PASSWORD}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
