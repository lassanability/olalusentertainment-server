const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/adminUser');
const { logActivity } = require('../utils/logger');

const DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'chicken@12345';

const signToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      isSuperAdmin: user.isSuperAdmin,
      isActive: user.isActive,
      passwordChangedFromDefault: user.passwordChangedFromDefault,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const admin = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = signToken(admin);

    await logActivity(
      { id: admin._id, email: admin.email, name: admin.name },
      'login', 'auth', String(admin._id), `Login from ${req.ip}`
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        roles: admin.roles,
        isSuperAdmin: admin.isSuperAdmin,
        passwordChangedFromDefault: admin.passwordChangedFromDefault,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    const admin = await AdminUser.findById(req.admin.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    const valid = await bcrypt.compare(currentPassword, admin.password);
    if (!valid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    admin.password = await bcrypt.hash(newPassword, 12);
    admin.passwordChangedFromDefault = true;
    await admin.save();

    const token = signToken(admin);

    await logActivity(req.admin, 'changePassword', 'auth', String(admin._id), 'Password changed');

    res.json({ success: true, message: 'Password changed successfully', token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.admin.id).select('-password');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    res.json({ success: true, data: admin });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
