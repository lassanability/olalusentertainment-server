const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');
const path = require('path');
const fs = require('fs');

const EMAIL_FROM = process.env.EMAIL_FROM || 'admin@olalusentertainment.com';
const WEBSITE_URL = process.env.WEBSITE || '';
const API_URL = process.env.API_URL || '';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || EMAIL_FROM;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || EMAIL_FROM;

const baseReplacements = () => ({
  websiteUrl: WEBSITE_URL,
  supportEmail: SUPPORT_EMAIL,
});

const getGraphClient = () => {
  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET,
  );
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });
  return Client.initWithMiddleware({ authProvider });
};

const sendViaGraph = async (to, subject, html) => {
  const client = getGraphClient();
  await client.api(`/users/${EMAIL_FROM}/sendMail`).post({
    message: {
      subject,
      body: { contentType: 'HTML', content: html },
      toRecipients: [{ emailAddress: { address: to } }],
      from: { emailAddress: { address: EMAIL_FROM } },
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

  if (!to) throw new Error('Recipient email is required.');

  let template = fs.readFileSync(templatePath, 'utf-8');
  Object.entries(replacements).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    template = template.replace(regex, escapeHtml(value));
  });

  await sendViaGraph(to, subject, template);
  return { success: true, message: 'Email sent successfully.' };
};

exports.sendWelcomeEmail = async (email, username) => {
  if (!email || !username) throw new Error('Email and username are required to send a welcome email.');
  return sendTemplatedEmail({
    to: email,
    subject: 'Welcome to Olalus Entertainment',
    templatePath: path.join(__dirname, '../client/welcome.html'),
    replacements: { ...baseReplacements(), username },
  });
};

exports.sendVerificationCodeEmail = async (email, username, verificationCode) => {
  if (!email || !username) throw new Error('Email and username are required to send a verification email.');
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
  if (!email || !username || !message) throw new Error('Email, username and message are required.');
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
  const templatePath = path.join(__dirname, '../client/newsletters.html');
  const template = fs.readFileSync(templatePath, 'utf-8');

  const applyReplacements = (raw, extra) => {
    let result = raw;
    Object.entries({ ...baseReplacements(), ...extra }).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), escapeHtml(value));
    });
    return result;
  };

  const list = Array.isArray(emails) ? emails : [emails];
  for (let i = 0; i < list.length; i += batchSize) {
    const batch = list.slice(i, i + batchSize);
    await Promise.all(batch.map(async (email) => {
      const username = email.split('@')[0];
      const html = applyReplacements(template, { username, message, subject });
      await sendViaGraph(email, subject, html);
      successfulEmails.push(email);
    }));
    if (i + batchSize < list.length) {
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }

  return successfulEmails;
};

exports.sendHealthReminderEmail = async (email, username, message) => {
  if (!email || !username) throw new Error('Email and username are required.');
  return sendTemplatedEmail({
    to: email,
    subject: 'A Reminder from Olalus Entertainment',
    templatePath: path.join(__dirname, '../client/remainder.html'),
    replacements: { ...baseReplacements(), username, message },
  });
};

exports.sendAdminEmail = async (email, username, makeAdmin) => {
  if (!email || !username) throw new Error('Email and username required for admin status email');
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
    replacements: { ...baseReplacements(), username, title: emailData.title, message: emailData.message },
  });
};

exports.deleteAccountEmail = async (email, username, details) => {
  const subject = details.deletedByAdmin
    ? 'Your Account Has Been Deleted by Administrator'
    : 'Account Deletion Confirmed — Olalus Entertainment';
  const deletionDate = new Date(details.deletionDate).toLocaleString('en-US', { timeZone: 'America/New_York' });
  let message = details.deletedByAdmin
    ? `Your account was deleted by an administrator on ${deletionDate}.${details.bulkDeletion ? ' This action was part of a bulk account cleanup process.' : ''}`
    : `As requested, your account was successfully deleted on ${deletionDate}.`;
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
      firstName, lastName, email,
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
      firstName, lastName,
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
      firstName, lastName, email,
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
