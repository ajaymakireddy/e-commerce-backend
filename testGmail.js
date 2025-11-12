import nodemailer from "nodemailer";

const EMAIL = "aniemailservice@gmail.com";
const PASSWORD = "ffanalbpwsuygqlj";

(async () => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: EMAIL,
        pass: PASSWORD,
      },
    });

    console.log("🔄 Verifying Gmail SMTP connection...");

    await transporter.verify();
    console.log("✅ Gmail SMTP connected successfully.");

    await transporter.sendMail({
      from: EMAIL,
      to: EMAIL,
      subject: "SMTP App Password Test",
      text: "If you receive this email, the Gmail App Password works.",
    });

    console.log("✅ Email sent successfully!");
  } catch (err) {
    console.error("❌ Failed:", err.message);
  }
})();
