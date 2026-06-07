import nodemailer from "nodemailer";
import { google } from "googleapis";
import { Resend } from "resend";
import config from "../config/config.js";

const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(
  config.Google_Client_Id,
  config.Google_Client_Secret,
  "https://developers.google.com/oauthplayground"
);
oauth2Client.setCredentials({ refresh_token: config.Google_Refresh_Token });

// Default sender. Override with EMAIL_FROM (e.g. "ExamPro <noreply@prosysltd.com>").
const FROM =
  config.EMAIL_FROM ||
  (config.Google_User ? `Exam System <${config.Google_User}>` : "ExamPro <onboarding@resend.dev>");

/**
 * Provider-agnostic email service.
 *   1. Resend         — when RESEND_API_KEY is set (recommended for prod).
 *   2. Gmail OAuth2    — when full Gmail credentials are set.
 *   3. Console (dev)   — otherwise: the OTP is printed to the logs so flows work
 *                        without an email provider configured (demo/local).
 */
export class EmailService {
  constructor() {
    this.gmailConfigured = Boolean(
      config.Google_Client_Id &&
        config.Google_Client_Secret &&
        config.Google_Refresh_Token &&
        config.Google_User
    );

    if (config.RESEND_API_KEY) {
      this.resend = new Resend(config.RESEND_API_KEY);
      this.provider = "resend";
    } else if (this.gmailConfigured) {
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: config.Google_User,
          clientId: config.Google_Client_Id,
          clientSecret: config.Google_Client_Secret,
          refreshToken: config.Google_Refresh_Token,
        },
      });
      this.provider = "gmail";
    } else {
      this.provider = "console";
    }
    console.log(`EmailService provider: ${this.provider}`);
  }

  _otpHtml(title, intro, otp, color) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="margin: 0 0 8px;">${title}</h2>
        <p style="color: #555; margin: 0 0 16px;">${intro}</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: ${color};">${otp}</div>
        <p style="color: #888; font-size: 13px; margin-top: 16px;">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
      </div>`;
  }

  async _send({ to, subject, html, otp }) {
    if (this.provider === "resend") {
      const { error } = await this.resend.emails.send({ from: FROM, to, subject, html });
      if (error) {
        console.error("Resend email failed:", error);
        throw new Error("Failed to send email");
      }
      return;
    }

    if (this.provider === "gmail") {
      const accessToken = await oauth2Client.getAccessToken();
      await this.transporter.sendMail({
        from: FROM,
        to,
        subject,
        html,
        auth: {
          user: config.Google_User,
          refreshToken: config.Google_Refresh_Token,
          accessToken: accessToken.token,
        },
      });
      return;
    }

    // Console fallback: no provider configured. Surface the OTP so registration
    // and password-reset still work for local/demo use. Never throws.
    console.log(`[email:console] to=${to} | ${subject} | OTP=${otp}`);
  }

  async sendVerificationEmail(email, otp) {
    await this._send({
      to: email,
      subject: "Verify your ExamPro email",
      html: this._otpHtml("Email Verification", "Your verification code is:", otp, "#4F46E5"),
      otp,
    });
  }

  async sendPasswordResetEmail(email, otp) {
    await this._send({
      to: email,
      subject: "ExamPro password reset code",
      html: this._otpHtml("Reset Password", "Your password reset code is:", otp, "#DC2626"),
      otp,
    });
  }
}
