import nodemailer from 'nodemailer';

/**
 * Creates and returns configured Nodemailer transporter
 */
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Sends a 6-digit OTP verification email to the user
 * @param {string} toEmail Recipient email address
 * @param {string} otp 6-digit numeric OTP code
 * @returns {Promise<{ sent: boolean, devMode?: boolean }>}
 */
export const sendVerificationOtpEmail = async (toEmail, otp) => {
  const transporter = getTransporter();
  const fromAddress = process.env.EMAIL_FROM || '"HealthVault Support" <noreply@healthvault.local>';

  if (!transporter) {
    console.error(
      `[EmailService ERROR] SMTP credentials are not configured in backend/.env. ` +
      `Please configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM for email delivery.`
    );

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email service is not configured on this server. Please contact system support.');
    }

    // In local development, log the OTP clearly so the developer can complete verification
    console.warn(
      `[EmailService DEV] Simulated email delivery for ${toEmail}. ` +
      `Your verification OTP is: [ ${otp} ] (Expires in 10 minutes)`
    );

    return { sent: false, devMode: true };
  }

  const mailOptions = {
    from: fromAddress,
    to: toEmail,
    subject: 'HealthVault — Verify Your Email Address (OTP Code)',
    text: `Welcome to HealthVault!\n\nYour 6-digit email verification code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not create a HealthVault account, please ignore this email.\n\nBest regards,\nThe HealthVault Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 8px;">
        <div style="border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #38bdf8;">HealthVault</h2>
          <p style="margin: 4px 0 0; color: #94a3b8; font-size: 14px;">Personal Medical Document Intelligence</p>
        </div>
        
        <h3 style="color: #f1f5f9; margin-top: 0;">Verify Your Email Address</h3>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.5;">
          Thank you for signing up for HealthVault. Please use the verification code below to activate your account:
        </p>
        
        <div style="background-color: #1e293b; border: 1px solid #0284c7; border-radius: 6px; padding: 18px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #38bdf8;">${otp}</span>
        </div>
        
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
          ⏱️ This code will expire in <strong>10 minutes</strong>.<br />
          🔒 For your security, never share this code with anyone.
        </p>
        
        <div style="border-top: 1px solid #334155; margin-top: 24px; padding-top: 16px; font-size: 12px; color: #64748b;">
          If you did not request this verification, you can safely disregard this email.
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Verification OTP successfully sent to ${toEmail}`);
    return { sent: true };
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${toEmail}:`, error.message);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};
