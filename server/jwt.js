
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'bmf-super-secret-2026';
const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 2; // 2 hours, matches old session expiry

function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

function verify(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
    sameSite: 'lax',
    path: '/',
  };
}

function readCookieToken(req, name) {
  const token = req.cookies && req.cookies[name];
  if (!token) return null;
  return verify(token);
}

function setCookieToken(res, name, payload) {
  res.cookie(name, sign(payload), cookieOptions());
}

function clearCookieToken(res, name) {
  res.clearCookie(name, { path: '/' });
}

module.exports = { sign, verify, cookieOptions, readCookieToken, setCookieToken, clearCookieToken };
