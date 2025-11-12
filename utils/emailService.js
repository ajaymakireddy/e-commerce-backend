import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Create and configure the SMTP transporter
 * Using Gmail + App Password for secure authentication
 */
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,           // Gmail address (e.g. donotreply.anieme@gmail.com)
    pass: process.env.EMAIL_PASSWORD,  // App password (not your normal Gmail password)
  },
});

/**
 * Verify SMTP connection once on startup
 * Logs result to the console for confirmation
 */
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Connection Failed:", error.message);
  } else {
    console.log("✅ SMTP Server Ready to Send Emails");
  }
});
