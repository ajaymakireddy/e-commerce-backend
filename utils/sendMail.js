import { transporter } from "./emailService.js";

export const sendOTPEmail = async (to, otp) => {
  try {
    const mailOptions = {
      from: `"Anieme Mailer" <${process.env.EMAIL}>`,
      to,
      subject: "Your OTP Verification Code 🔐",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>OTP Verification</h2>
          <p>Your one-time password (OTP) for account verification is:</p>
          <h3 style="background:#f3f3f3;padding:10px;border-radius:6px;width:fit-content;">${otp}</h3>
          <p>This OTP will expire in 5 minutes.</p>
          <br>
          <p>Best regards,<br><strong>Anieme Team</strong></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ OTP email sent successfully to:", to);
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
  }
};
