import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// 🟢 Debug line — to confirm the .env variables are loaded correctly
console.log("Using Gmail account:", process.env.EMAIL);

async function testMail() {
  try {
    const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
  });


    await transporter.verify();
    console.log("✅ SMTP connection successful");

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: process.env.EMAIL,
      subject: "Anieme Gmail SMTP Test ✅",
      text: "This confirms Gmail SMTP connection is working with App Password.",
    });

    console.log("✅ Test email sent successfully!");
  } catch (err) {
    console.error("❌ Failed:", err.message);
  }
}

testMail();
