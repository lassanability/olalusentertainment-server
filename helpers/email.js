const nodemailer = require("nodemailer");
const path = require('path');
const fs = require('fs');

const EMAIL_FROM = process.env.EMAIL_USER;
const WEBSITE_URL = process.env.WEBSITE || '';
const API_URL = process.env.API_URL || '';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || EMAIL_FROM;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || EMAIL_FROM;

const baseReplacements = () => ({
  websiteUrl: WEBSITE_URL,
  supportEmail: SUPPORT_EMAIL,
});

const emailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

const sendTemplatedEmail = async (options) => {
  const { to, subject, templatePath, replacements } = options;

  if (!to) {
    throw new Error('Recipient email is required.');
  }

  let template = fs.readFileSync(templatePath, 'utf-8');

  Object.entries(replacements).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    template = template.replace(regex, escapeHtml(value));
  });

  const mailOptions = {
    from: `"Olalus Entertainment" <${EMAIL_FROM}>`,
    to,
    subject,
    html: template,
  };

  const transporter = emailTransporter();
  const info = await transporter.sendMail(mailOptions);
  return { success: true, message: 'Email sent successfully.', info };
};

exports.sendWelcomeEmail = async (email, username) => {
  if (!email || !username) {
    throw new Error('Email and username are required to send a welcome email.');
  }

  return sendTemplatedEmail({
    to: email,
    subject: 'Welcome to Olalus Entertainment',
    templatePath: path.join(__dirname, '../client/welcome.html'),
    replacements: { ...baseReplacements(), username },
  });
};

exports.sendVerificationCodeEmail = async (email, username, verificationCode) => {
  if (!email || !username) {
    throw new Error('Email and username are required to send a verification email.');
  }

  return sendTemplatedEmail({
    to: email,
    subject: 'Your Verification Code — Olalus Entertainment',
    templatePath: path.join(__dirname, '../client/verification.html'),
    replacements: { ...baseReplacements(), username, verificationCode },
  });
};

exports.sendPasswordResetEmail = async (username, email, resetToken) => {
  const deepLink = `${API_URL}/reset?token=${resetToken}&email=${encodeURIComponent(email)}`;

  return sendTemplatedEmail({
    to: email,
    subject: 'Password Reset Request — Olalus Entertainment',
    templatePath: path.join(__dirname, '../client/passwordEmailReset.html'),
    replacements: { ...baseReplacements(), username, resetUrl: deepLink },
  });
};

exports.sendResetSucessfulEmail = async (username, email) => {
  return sendTemplatedEmail({
    to: email,
    subject: 'Password Reset Successful — Olalus Entertainment',
    templatePath: path.join(__dirname, '../client/passwordResetSuccesful.html'),
    replacements: { ...baseReplacements(), username },
  });
};

exports.contactEmail = async (email, username, message, subject = 'Contact Us') => {
  if (!email || !username || !message) {
    throw new Error('Email, username and message are required to send a contact email.');
  }

  const date = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

  await sendTemplatedEmail({
    to: ADMIN_EMAIL,
    subject: `Contact Form: ${subject}`,
    templatePath: path.join(__dirname, '../client/contact.html'),
    replacements: { ...baseReplacements(), username, email, message, subject, date },
  });

  return sendTemplatedEmail({
    to: email,
    subject: 'We Received Your Message — Olalus Entertainment',
    templatePath: path.join(__dirname, '../client/contactAutoReply.html'),
    replacements: { ...baseReplacements(), username, subject },
  });
};

exports.sendNewsletterEmails = async (emails, subject, message) => {
  const batchSize = 10;
  const batchDelay = 10000;
  const successfulEmails = [];
  const transporter = emailTransporter();
  const templatePath = path.join(__dirname, '../client/newsletters.html');
  const template = fs.readFileSync(templatePath, 'utf-8');

  const applyReplacements = (raw, extra) => {
    let result = raw;
    const all = { ...baseReplacements(), ...extra };
    Object.entries(all).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), escapeHtml(value));
    });
    return result;
  };

  if (Array.isArray(emails)) {
    for (let i = 0; i < emails.length; i += batchSize) {
      const batchEmails = emails.slice(i, i + batchSize);

      const promises = batchEmails.map(email => {
        const username = email.split('@')[0];
        const personalizedTemplate = applyReplacements(template, { username, message, subject });

        return transporter.sendMail({
          from: `"Olalus Entertainment" <${EMAIL_FROM}>`,
          to: email,
          subject,
          html: personalizedTemplate,
        });
      });

      const results = await Promise.all(promises);
      successfulEmails.push(...results
        .filter(result => result.accepted && result.accepted.length > 0)
        .map(result => result.accepted[0]));

      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }
  } else {
    const username = emails.split('@')[0];
    const personalizedTemplate = applyReplacements(template, { username, message, subject });
    const result = await transporter.sendMail({
      from: `"Olalus Entertainment" <${EMAIL_FROM}>`,
      to: emails,
      subject,
      html: personalizedTemplate,
    });
    if (result.accepted && result.accepted.length > 0) {
      successfulEmails.push(result.accepted[0]);
    }
  }

  return successfulEmails;
};

exports.sendHealthReminderEmail = async (email, username, message) => {
  if (!email || !username) {
    throw new Error('Email and username are required to send a health reminder email.');
  }

  return sendTemplatedEmail({
    to: email,
    subject: 'A Reminder from Olalus Entertainment',
    templatePath: path.join(__dirname, '../client/remainder.html'),
    replacements: { ...baseReplacements(), username, message },
  });
};

exports.sendAdminEmail = async (email, username, makeAdmin) => {
  if (!email || !username) {
    throw new Error('Email and username required for admin status email');
  }

  const emailData = {
    title: makeAdmin ? 'Welcome, New Admin' : 'Admin Access Removed',
    message: makeAdmin
      ? 'You have been granted admin privileges. Log in to the admin dashboard to manage site features.'
      : 'Your admin access has been revoked. You no longer have access to admin features.',
    subject: makeAdmin ? 'Admin Access Granted — Olalus Entertainment' : 'Admin Access Removed — Olalus Entertainment',
  };

  return sendTemplatedEmail({
    to: email,
    subject: emailData.subject,
    templatePath: path.join(__dirname, '../client/adminEmail.html'),
    replacements: {
      ...baseReplacements(),
      username,
      title: emailData.title,
      message: emailData.message,
    },
  });
};

exports.deleteAccountEmail = async (email, username, details) => {
  const subject = details.deletedByAdmin
    ? 'Your Account Has Been Deleted by Administrator'
    : 'Account Deletion Confirmed — Olalus Entertainment';

  const deletionDate = new Date(details.deletionDate).toLocaleString('en-US', { timeZone: 'America/New_York' });

  let message = '';
  if (details.deletedByAdmin) {
    message += `Your account was deleted by an administrator on ${deletionDate}.`;
    if (details.bulkDeletion) {
      message += ' This action was part of a bulk account cleanup process.';
    }
  } else {
    message += `As requested, your account was successfully deleted on ${deletionDate}.`;
  }

  return sendTemplatedEmail({
    to: email,
    subject,
    templatePath: path.join(__dirname, '../client/accountDeleted.html'),
    replacements: { ...baseReplacements(), username, message },
  });
};

exports.sendSubscriptionConfirmationEmail = async (email) => {
  const username = email.split('@')[0];
  return sendTemplatedEmail({
    to: email,
    subject: "You're Subscribed — Olalus Entertainment",
    templatePath: path.join(__dirname, '../client/subscribeConfirmation.html'),
    replacements: { ...baseReplacements(), username },
  });
};

exports.sendJobApplicationEmail = async (email, firstName, lastName, position) => {
  return sendTemplatedEmail({
    to: email,
    subject: 'Application Received — Olalus Entertainment',
    templatePath: path.join(__dirname, '../client/jobApplication.html'),
    replacements: { ...baseReplacements(), firstName, lastName, position },
  });
};

exports.sendJobApplicationAdminEmail = async (data) => {
  const { firstName, lastName, email, phone, position, message } = data;

  return sendTemplatedEmail({
    to: ADMIN_EMAIL,
    subject: `New Job Application: ${position}`,
    templatePath: path.join(__dirname, '../client/jobApplicationAdmin.html'),
    replacements: {
      ...baseReplacements(),
      firstName,
      lastName,
      email,
      phone: phone || 'Not provided',
      position,
      message: message || 'No message provided',
      date: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
    },
  });
};

exports.sendAppointmentConfirmationEmail = async (data) => {
  const { firstName, lastName, email, serviceType, dateTime, type } = data;
  const formattedDate = dateTime
    ? new Date(dateTime).toLocaleString('en-US', { timeZone: 'America/New_York' })
    : 'To be confirmed';

  return sendTemplatedEmail({
    to: email,
    subject: `${type === 'consultation' ? 'Consultation' : 'Appointment'} Request Received — Olalus Entertainment`,
    templatePath: path.join(__dirname, '../client/appointmentConfirmation.html'),
    replacements: {
      ...baseReplacements(),
      firstName,
      lastName,
      serviceType: serviceType || 'General',
      dateTime: formattedDate,
      type: type === 'consultation' ? 'Consultation' : 'Appointment',
    },
  });
};

exports.sendAppointmentAdminEmail = async (data) => {
  const { firstName, lastName, email, phone, serviceType, dateTime, message, type } = data;
  const formattedDate = dateTime
    ? new Date(dateTime).toLocaleString('en-US', { timeZone: 'America/New_York' })
    : 'Not specified';

  return sendTemplatedEmail({
    to: ADMIN_EMAIL,
    subject: `New ${type === 'consultation' ? 'Consultation' : 'Appointment'} Request: ${firstName} ${lastName}`,
    templatePath: path.join(__dirname, '../client/appointmentAdmin.html'),
    replacements: {
      ...baseReplacements(),
      firstName,
      lastName,
      email,
      phone: phone || 'Not provided',
      serviceType: serviceType || 'General',
      dateTime: formattedDate,
      message: message || 'No message provided',
      type: type === 'consultation' ? 'Consultation' : 'Appointment',
      date: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
    },
  });
};

module.exports = exports;
