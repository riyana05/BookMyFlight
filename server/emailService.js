

const nodemailer = require('nodemailer');

let transporter = null;
let triedToInit = false;

function getTransporter() {
  if (triedToInit) return transporter;
  triedToInit = true;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === 'true', 
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

async function sendOtpEmail(email, code) {
  const expiry = process.env.OTP_EXPIRY_MINUTES || 10;
  const t = getTransporter();

  if (!t) {
    console.log(`\n📧 [DEV MODE — no SMTP configured] OTP for ${email}: ${code} (expires in ${expiry}m)\n`);
    return { devMode: true };
  }

  const fromAddress = process.env.FROM_EMAIL || process.env.SMTP_USER;
  const fromName = process.env.FROM_NAME || 'Book My Flight';

  await t.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: email,
    subject: 'Your Book My Flight verification code',
    text: `Your verification code is ${code}. It expires in ${expiry} minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:28px;border:1px solid #eee;border-radius:14px;">
        <h2 style="color:#6B4FA0;margin:0 0 12px;">✈ Book My Flight</h2>
        <p style="color:#333;font-size:14px;">Use the code below to sign in:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#4A2E7A;margin:18px 0;text-align:center;">${code}</div>
        <p style="color:#777;font-size:12px;">This code expires in ${expiry} minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  return { devMode: false };
}

module.exports = { sendOtpEmail };
