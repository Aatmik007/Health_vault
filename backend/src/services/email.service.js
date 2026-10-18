import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationOtpEmail = async (toEmail, otp) => {
  try {
    const data = await resend.emails.send({
      from: 'HealthVault <onboarding@resend.dev>', // Free tier mein yeh default domain use kar sakte ho
      to: [toEmail],
      subject: 'HealthVault — Verify Your Email Address (OTP Code)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 8px;">
          <h2 style="color: #38bdf8;">HealthVault Verification</h2>
          <p>Your 6-digit verification code is:</p>
          <div style="background-color: #1e293b; padding: 18px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #38bdf8;">${otp}</span>
          </div>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });

    console.log(`[EmailService] OTP sent successfully via Resend:`, data);
    return { sent: true };
  } catch (error) {
    console.error(`[EmailService] Failed to send email:`, error.message);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};