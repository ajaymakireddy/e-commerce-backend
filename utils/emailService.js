import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create transporter
export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,           // SSL port for Gmail
  secure: true,        // true for port 465
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify SMTP connection once at startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Connection Failed:", error.message);
  } else {
    console.log("✅ SMTP Server Ready to Send Emails");
  }
});
