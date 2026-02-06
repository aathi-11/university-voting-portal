/**
 * Email Service - Send OTP via Gmail
 * Uses Nodemailer to send OTP to user's email address
 */
const nodemailer = require("nodemailer");

// Configure Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Send OTP to user's email
 * @param {string} email - Recipient email address
 * @param {string} otp - One-Time Password to send
 * @param {string} userName - User name/roll for personalization
 * @returns {Promise<boolean>} - Success status
 */
async function sendOTPEmail(email, otp, userName) {
  try {
    // Check if Gmail credentials are configured (REQUIRED)
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      throw new Error(
        "Gmail not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env"
      );
    }

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: "University Voting Portal - Your OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">University Voting Portal</h2>
          <p>Hello <strong>${userName}</strong>,</p>
          <p>Your One-Time Password (OTP) for login is:</p>
          <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center;">
            <h1 style="color: #2c3e50; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #666; margin-top: 20px;">
            <strong>This OTP is valid for 5 minutes only.</strong>
          </p>
          <p style="color: #666;">If you did not request this OTP, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated email from the University Voting Portal. Please do not reply.
          </p>
        </div>
      `,
      text: `Your OTP is: ${otp}\n\nThis OTP is valid for 5 minutes only.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("[INFO] OTP email sent to", email, "- Message ID:", info.messageId);
    return true;
  } catch (error) {
    console.error("[ERROR] Failed to send OTP email:", error.message);
    throw error;
  }
}

module.exports = {
  sendOTPEmail,
};
