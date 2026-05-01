const nodemailer = require('nodemailer');

const createTransporter = () => {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    
    if (!user || !pass) {
        console.error('[MAILER] ❌ Gmail credentials missing!');
        console.error('[MAILER]    GMAIL_USER:', user ? '✓' : '✗ NOT SET');
        console.error('[MAILER]    GMAIL_APP_PASSWORD:', pass ? '✓' : '✗ NOT SET');
    }
    
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        family: 4,                 // force IPv4 — Railway blocks IPv6 SMTP
        auth: { user, pass },
        connectionTimeout: 8000,
        greetingTimeout:   5000,
        socketTimeout:     10000,
    });
};

const sendVerificationEmail = async (toEmail, name, token) => {
    const verifyUrl = `${process.env.APP_BASE_URL}/api/auth/verify-email/${token}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="margin:0;padding:0;background:#0d0d0d;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
        <tr><td align="center">
          <table width="500" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;overflow:hidden;max-width:500px;width:100%;">
            <!-- Header -->
            <tr>
              <td style="background:#f5c518;padding:28px;text-align:center;">
                <h1 style="margin:0;color:#000;font-size:28px;font-weight:900;letter-spacing:4px;">SAFORA</h1>
                <p style="margin:4px 0 0;color:#000;font-size:12px;letter-spacing:2px;opacity:0.7;">SAFE • AFFORDABLE • RIDES</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 32px;">
                <h2 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 12px;">Hi ${name || 'there'} 👋</h2>
                <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 28px;">
                  Thanks for joining SAFORA! Please verify your email address to activate your account.
                </p>
                <div style="text-align:center;margin:0 0 28px;">
                  <a href="${verifyUrl}"
                     style="display:inline-block;background:#f5c518;color:#000;font-weight:700;font-size:15px;
                            padding:16px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.5px;">
                    ✓ Verify Email Address
                  </a>
                </div>
                <p style="color:#666;font-size:12px;line-height:1.5;margin:0 0 8px;">
                  This link expires in <strong style="color:#f5c518;">24 hours</strong>.
                  If you didn't create a SAFORA account, you can safely ignore this email.
                </p>
                <p style="color:#444;font-size:11px;margin:0;word-break:break-all;">
                  Or copy this link: <a href="${verifyUrl}" style="color:#f5c518;">${verifyUrl}</a>
                </p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#111;padding:16px 32px;text-align:center;border-top:1px solid #222;">
                <p style="color:#444;font-size:11px;margin:0;">© 2026 SAFORA — Safe rides for everyone</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;

    const transporter = createTransporter();
    await transporter.sendMail({
        from: `SAFORA <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: 'Verify your SAFORA account ✓',
        html,
    });
};

// ─── Admin OTP Email ──────────────────────────────────────────────────────────

const sendAdminOTPEmail = async (toEmail, name, otp) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0a0e1a;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e1a;padding:40px 20px;">
        <tr><td align="center">
          <table width="480" cellpadding="0" cellspacing="0"
                 style="background:#141a28;border-radius:18px;overflow:hidden;max-width:480px;width:100%;
                        border:1px solid #1f2937;">
            <tr>
              <td style="background:#F5C518;padding:24px 32px;text-align:center;">
                <h1 style="margin:0;color:#000;font-size:26px;font-weight:900;letter-spacing:4px;">SAFORA</h1>
                <p style="margin:4px 0 0;color:#000;font-size:11px;letter-spacing:2px;opacity:0.65;">
                  ADMIN CONTROL PANEL
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px;text-align:center;">
                <p style="color:#8b949e;font-size:14px;margin:0 0 8px;">Hello, ${name || 'Admin'}</p>
                <h2 style="color:#f0f6fc;font-size:18px;font-weight:700;margin:0 0 28px;">
                  Your Admin Login Code
                </h2>
                <div style="background:#0a0e1a;border:2px solid #F5C518;border-radius:16px;
                            padding:24px;margin:0 0 28px;display:inline-block;min-width:180px;">
                  <span style="font-size:40px;font-weight:900;color:#F5C518;letter-spacing:10px;">
                    ${otp}
                  </span>
                </div>
                <p style="color:#8b949e;font-size:13px;line-height:1.6;margin:0 0 8px;">
                  This code expires in <strong style="color:#f0f6fc;">10 minutes</strong>.
                </p>
                <p style="color:#484f58;font-size:12px;margin:0;">
                  If you did not request this code, your admin panel may be under attack.<br/>
                  Contact your security team immediately.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#0d1117;padding:14px 32px;text-align:center;border-top:1px solid #1f2937;">
                <p style="color:#484f58;font-size:11px;margin:0;">
                  🔒 SAFORA Admin — Authorised Personnel Only
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;

    const transporter = createTransporter();
    
    try {
        const info = await transporter.sendMail({
            from:    `SAFORA Admin Panel <${process.env.GMAIL_USER}>`,
            to:      toEmail,
            subject: `🔐 Admin Login Code: ${otp}`,
            html,
        });
        
        console.log(`[MAILER] ✅ Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`[MAILER] ❌ Send error: ${error.message}`);
        console.error(`[MAILER]    Code: ${error.code}`);
        console.error(`[MAILER]    Cmd: ${error.command}`);
        throw error; // Re-throw so caller knows it failed
    }
};

module.exports = { sendVerificationEmail, sendAdminOTPEmail };
