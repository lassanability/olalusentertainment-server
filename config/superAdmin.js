const bcrypt = require('bcrypt');
const AdminUser = require('../models/adminUser');

async function initSuperAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_DEFAULT_PASSWORD || 'chicken@12345';

  if (!email) {
    console.warn('[SuperAdmin] ADMIN_EMAIL not set — skipping super admin sync');
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    // Find the env-managed super admin record (regardless of current email)
    let envAdmin = await AdminUser.findOne({ envManaged: true });

    if (envAdmin) {
      const emailChanged = envAdmin.email !== email;
      const updates = {
        isSuperAdmin: true,
        isActive: true,
        envManaged: true,
        roles: AdminUser.schema.statics.ALL_ROLES || [],
      };

      if (emailChanged) {
        // Free up old email slot if a non-env record exists with the new email
        await AdminUser.deleteOne({ email, envManaged: { $ne: true } });
        updates.email = email;
        updates.passwordChangedFromDefault = false;
        console.log(`[SuperAdmin] Email updated: ${envAdmin.email} → ${email}`);
      }

      // Always re-sync the password from env so changing ADMIN_DEFAULT_PASSWORD takes effect
      updates.password = hashedPassword;
      updates.passwordChangedFromDefault = false;

      await AdminUser.updateOne({ _id: envAdmin._id }, { $set: updates });
      if (!emailChanged) {
        console.log(`[SuperAdmin] Credentials synced for: ${email}`);
      }
      return;
    }

    // No env-managed record yet — migrate existing super admin or create fresh
    const existing = await AdminUser.findOne({ email });
    if (existing) {
      await AdminUser.updateOne({ _id: existing._id }, {
        $set: {
          isSuperAdmin: true,
          isActive: true,
          envManaged: true,
          password: hashedPassword,
          passwordChangedFromDefault: false,
          roles: AdminUser.schema.statics.ALL_ROLES || [],
        },
      });
      console.log(`[SuperAdmin] Migrated existing account to env-managed: ${email}`);
      return;
    }

    await AdminUser.create({
      email,
      password: hashedPassword,
      name: 'Super Admin',
      isSuperAdmin: true,
      envManaged: true,
      roles: AdminUser.schema.statics.ALL_ROLES || [],
      isActive: true,
      passwordChangedFromDefault: false,
    });

    console.log(`[SuperAdmin] Created super admin: ${email}`);
    console.log(`[SuperAdmin] Default password: ${password} — PLEASE CHANGE IT`);
  } catch (err) {
    console.error('[SuperAdmin] Failed to sync super admin:', err.message);
  }
}

module.exports = { initSuperAdmin };
