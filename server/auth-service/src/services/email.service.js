import nodemailer from "nodemailer";
import { google } from "googleapis";
import config from "../config/config.js";
const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(
  config.Google_Client_Id,
  config.Google_Client_Secret,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: config.Google_Refresh_Token,
});
export class EmailService {
  constructor() {
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
  }
  // =========================
  // EMAIL VERIFICATION
  // =========================
  async sendVerificationEmail(email, otp) {
    try {
      const accessToken = await oauth2Client.getAccessToken();
      const response = await this.transporter.sendMail({
        from: `"Exam System" <${config.Google_User}>`,

        to: email,

        subject: "Verify Your Email",

        auth: {
          user: config.Google_User,

          refreshToken: config.Google_Refresh_Token,

          accessToken: accessToken.token,
        },

        html: `
              <div style="
                font-family: Arial;
                padding: 20px;
              ">

                <h2>
                  Email Verification
                </h2>

                <p>
                  Your OTP is:
                </p>

                <h1 style="
                  color: #4F46E5;
                ">
                  ${otp}
                </h1>

                <p>
                  This OTP expires
                  in 2 minutes.
                </p>

              </div>
            `,
      });

      console.log("Verification email sent:", response.messageId);

      return response;
    } catch (error) {
      console.error("Verification email failed:", error);

      throw new Error("Failed to send verification email");
    }
  }

  // =========================
  // PASSWORD RESET
  // =========================

  async sendPasswordResetEmail(email, otp) {
    try {
      const accessToken = await oauth2Client.getAccessToken();
      const response = await this.transporter.sendMail({
        from: `"Exam System" <${config.Google_User}>`,

        to: email,

        subject: "Password Reset OTP",

        auth: {
          user: config.Google_User,

          refreshToken: config.Google_Refresh_Token,

          accessToken: accessToken.token,
        },

        html: `
              <div style="
                font-family: Arial;
                padding: 20px;
              ">

                <h2>
                  Reset Password
                </h2>

                <p>
                  Your password reset OTP is:
                </p>

                <h1 style="
                  color: #DC2626;
                ">
                  ${otp}
                </h1>

                <p>
                  This OTP expires
                  in 2 minutes.
                </p>

              </div>
            `,
      });

      console.log("Password reset email sent:", response.messageId);
      return response;
    } catch (error) {
      console.error("Password reset email failed:", error);
      throw new Error("Failed to send password reset email");
    }
  }
}
