import { transporter } from "./emailService.js";

export const sendOTPEmail = async (to, otp) => {
  try {
    const mailOptions = {
      from: `"E-Commerce App" <${process.env.EMAIL}>`,
      to,
      subject: "Your OTP for Signup",
      text: `Your One-Time Password (OTP) is ${otp}. It is valid for 5 minutes.`,
      html: `<p>Your OTP for signup is <b>${otp}</b>. It will expire in 5 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ OTP email sent successfully to:", to);
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
  }
};
