const nodemailer = require('nodemailer');

const createTransporter = () => nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

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

module.exports = { sendVerificationEmail };
