

const crypto = require('crypto');
const User = require('./models/User');
const OtpCode = require('./models/OtpCode');
const { sendOtpEmail } = require('./emailService');
const { isDbConnected } = require('./config/db');
const { setCookieToken, clearCookieToken, readCookieToken } = require('./jwt');

const COOKIE_NAME = 'bmf_user';

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES) || 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit, e.g. "042913"
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function requestOtp(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Account service is not configured yet. Please set MONGODB_URI and try again.' });
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const recent = await OtpCode.findOne({ email }).sort({ createdAt: -1 });
    if (recent) {
      const elapsedSeconds = (Date.now() - recent.createdAt.getTime()) / 1000;
      if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
        const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds);
        return res.status(429).json({ error: `Please wait ${wait}s before requesting another code.` });
      }
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

    await OtpCode.deleteMany({ email });
    await OtpCode.create({ email, code: hashCode(code), expiresAt, attempts: 0 });

    await sendOtpEmail(email, code);

    return res.json({
      success: true,
      message: `Verification code sent to ${email}`,
      expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    });
  } catch (e) {
    console.error('requestOtp error:', e);
    return res.status(500).json({ error: 'Could not send verification code. Please try again.' });
  }
}


async function verifyOtp(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Account service is not configured yet. Please set MONGODB_URI and try again.' });
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    const code = String(req.body.code || '').trim();
    if (!isValidEmail(email) || !code) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const record = await OtpCode.findOne({ email }).sort({ createdAt: -1 });
    if (!record) {
      return res.status(400).json({ error: 'No verification code found for this email. Please request a new one.' });
    }
    if (record.expiresAt < new Date()) {
      await OtpCode.deleteMany({ email });
      return res.status(400).json({ error: 'That code has expired. Please request a new one.' });
    }
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      await OtpCode.deleteMany({ email });
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }
    if (hashCode(code) !== record.code) {
      record.attempts += 1;
      await record.save();
      const left = MAX_VERIFY_ATTEMPTS - record.attempts;
      return res.status(400).json({ error: `Incorrect code. ${left} attempt(s) left.` });
    }

    await OtpCode.deleteMany({ email });

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, verified: true, lastLoginAt: new Date() });
    } else {
      user.verified = true;
      user.lastLoginAt = new Date();
      await user.save();
    }

    setCookieToken(res, COOKIE_NAME, { userId: user._id.toString(), userEmail: user.email });

    return res.json({ success: true, email: user.email, message: 'Logged in successfully' });
  } catch (e) {
    console.error('verifyOtp error:', e);
    return res.status(500).json({ error: 'Could not verify code. Please try again.' });
  }
}

function userLogout(req, res) {
  clearCookieToken(res, COOKIE_NAME);
  return res.json({ success: true, message: 'Logged out successfully' });
}

function userStatus(req, res) {
  const payload = readCookieToken(req, COOKIE_NAME);
  if (payload && payload.userEmail) {
    return res.json({ loggedIn: true, email: payload.userEmail });
  }
  return res.json({ loggedIn: false });
}

function requireUser(req, res, next) {
  const payload = readCookieToken(req, COOKIE_NAME);
  if (payload && payload.userId) {
    req.user = payload;
    return next();
  }
  return res.status(401).json({ error: 'Please sign in to continue.' });
}

module.exports = { requestOtp, verifyOtp, userLogout, userStatus, requireUser };
