import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { CURRENCY_CODES } from '../constants/categories.js';

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    currency: user.currency,
    theme: user.theme,
    monthlyBudgetDefault: user.monthlyBudgetDefault,
    notificationsEnabled: user.notificationsEnabled,
    phone: user.phone || '',
    occupation: user.occupation || '',
    createdAt: user.createdAt,
  };
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, currency } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters long.' });
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const userCurrency = CURRENCY_CODES.includes(currency) ? currency : 'INR';

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      currency: userCurrency,
    });

    await Notification.create({
      user: user._id,
      title: 'Welcome to MoneyMate!',
      message: 'Your personal finance workspace is ready. Start by adding your income, expenses, or setting a monthly budget.',
      type: 'info',
    });

    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user._id);
    res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, password reset instructions have been generated.',
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save({ validateBeforeSave: false });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${rawToken}`;

    const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    if (smtpConfigured) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'MoneyMate <noreply@moneymate.app>',
        to: user.email,
        subject: 'MoneyMate — Password Reset Request',
        html: `<p>Hi ${user.name},</p><p>Click the link below to reset your password (valid for 30 minutes):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });

      return res.json({
        message: 'Password reset link has been sent to your email address.',
      });
    }

    // When SMTP is not configured in local/self-hosted setup, provide the secure token link directly
    res.json({
      message: 'Password reset link generated. Use the link below to reset your password (expires in 30 minutes).',
      resetUrl,
      resetToken: rawToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Reset token is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Your password has been reset successfully. You can now sign in.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res, next) => {
  try {
    const { name, currency, theme, monthlyBudgetDefault, notificationsEnabled, phone, occupation } = req.body;
    const user = await User.findById(req.user._id);

    if (name !== undefined) {
      if (name.trim().length < 2) {
        return res.status(400).json({ message: 'Name must be at least 2 characters.' });
      }
      user.name = name.trim();
    }
    if (currency !== undefined && CURRENCY_CODES.includes(currency)) {
      user.currency = currency;
    }
    if (theme !== undefined && ['light', 'dark'].includes(theme)) {
      user.theme = theme;
    }
    if (monthlyBudgetDefault !== undefined) {
      const val = Number(monthlyBudgetDefault);
      if (Number.isNaN(val) || val < 0) {
        return res.status(400).json({ message: 'Monthly budget default must be a valid non-negative number.' });
      }
      user.monthlyBudgetDefault = val;
    }
    if (notificationsEnabled !== undefined) {
      user.notificationsEnabled = Boolean(notificationsEnabled);
    }
    if (phone !== undefined) user.phone = String(phone).trim();
    if (occupation !== undefined) user.occupation = String(occupation).trim();

    await user.save();
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
