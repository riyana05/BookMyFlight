

const { setCookieToken, clearCookieToken, readCookieToken } = require('./jwt');

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'bmf@2026';
const COOKIE_NAME = 'bmf_admin';


function requireAdmin(req, res, next) {
  const payload = readCookieToken(req, COOKIE_NAME);
  if (payload && payload.isAdmin) {
    req.admin = payload;
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized. Admin login required.' });
}

function adminLogin(req, res) {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const loginTime = new Date().toISOString();
    setCookieToken(res, COOKIE_NAME, { isAdmin: true, username, loginTime });
    return res.json({ success: true, username, message: 'Login successful' });
  }
  return res.status(401).json({ error: 'Invalid username or password' });
}


function adminLogout(req, res) {
  clearCookieToken(res, COOKIE_NAME);
  return res.json({ success: true, message: 'Logged out successfully' });
}

function sessionStatus(req, res) {
  const payload = readCookieToken(req, COOKIE_NAME);
  if (payload && payload.isAdmin) {
    return res.json({ isAdmin: true, username: payload.username, loginTime: payload.loginTime });
  }
  return res.json({ isAdmin: false });
}

module.exports = { requireAdmin, adminLogin, adminLogout, sessionStatus };
