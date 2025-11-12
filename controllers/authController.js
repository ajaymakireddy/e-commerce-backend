const db = require('../models');
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const moment = require('moment');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

// Import Models
const { User, OTP } = db;


// OTP valid for 15 minutes
const OTP_EXPIRY_MINUTES = 15;



/* ============================================================
   Helper: Send OTP Email
============================================================ */
async function sendOTPEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
  service : "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
      },
    });

    const options = {
      from: `"E-Commerce" <${process.env.EMAIL}>`,
      to: email,
      subject: 'Your OTP Code',
      html: `<p>Your OTP is <b>${otp}</b>. It expires in 15 minutes.</p>`
    };

    await transporter.sendMail(options);
    console.log(`OTP sent to ${email}`);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
}


/* ============================================================
   1️. Generate OTP for Signup
============================================================ */

const signup = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    // Check if user already exists
    let user = await User.findOne({ where: { email } });

    // If not, create new user
    if (!user) {
      user = await User.create({
        name: "User_" + Math.floor(Math.random() * 10000), // ✅ optional
        email,
        isVerified: false,
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiry

    // Save or update OTP
    await OTP.upsert({
      email,
      otp,
      purpose: "Signup",
      expiresAt,
    });

    // ✅ Send email using correct helper
    await sendOTPEmail(email, otp);

    return res.status(200).json({
      message: "OTP sent successfully to your email.",
      email,
    });
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


/* ============================================================
   2️. Verify OTP & Activate Account (Email + OTP only)
============================================================ */
const verify_otp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    // Check OTP validity
    const otpRecord = await OTP.findOne({
      where: {
        email,
        otp,
        purpose: "Signup",
        expiresAt: { [Op.gt]: new Date() }, // ensure not expired
      },
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Mark user as verified
    await user.update({ isVerified: true });

    // Delete OTP
    await OTP.destroy({ where: { email } });

    // ✅ Generate Access & Refresh Tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } // 1 hour validity
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" } // 7 days validity
    );

    // ✅ Save refresh token in DB
    await user.update({ refreshToken });

    return res.status(200).json({
      message: "OTP verified successfully. Account activated.",
      user: {
        id: user.id,
        email: user.email,
        isVerified: user.isVerified,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


/* ============================================================
   3.  Refresh Access Token- When the access token expires, the frontend sends the refresh token to this endpoint (/auth/refresh) to get a new access token automatically
============================================================ */
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required." });
    }

    // Verify token validity
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if refresh token still exists in DB
    const user = await User.findOne({ where: { id: decoded.id, refreshToken } });
    if (!user) {
      return res.status(403).json({ message: "Invalid or expired refresh token." });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "New access token generated successfully.",
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Refresh Token Error:", error);
    return res.status(401).json({ message: "Invalid or expired refresh token." });
  }
};


/* ============================================================
   4. Login (Email or Mobile + Password)
============================================================ */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // 🔍 Check user existence by email or mobile
    const user = await User.findOne({
      where: {
        [Op.or]: [{ email }, { mobile: email }],
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 🔐 Validate password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid password." });
    }

    // ⚙️ Generate Access Token (short-lived)
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // ⚙️ Generate Refresh Token (long-lived)
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // 💾 Save refresh token in DB for validation later
    await user.update({ refreshToken });

    // 🎯 Return both tokens
    return res.status(200).json({
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


/* ============================================================
   5. Forgot Password → Generate OTP
============================================================ */
const forgotPassword = async (req, res) => {
  try {
    const { email, mobile } = req.body;

    if (!email && !mobile) {
      return res.status(400).json({ message: "Email or mobile is required." });
    }

    // ✅ Build dynamic condition
    const whereCondition = {};
    if (email) whereCondition.email = email;
    if (mobile) whereCondition.mobile = mobile;

    const user = await User.findOne({ where: whereCondition });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 🔢 Generate numeric-only OTP (same logic as signup)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ⏰ Expire in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // 💾 Save OTP to DB
    await OTP.create({
      email,
      otp,
      purpose: "PasswordReset",
      expiresAt,
    });

    // 📧 Send email with OTP
    if (email) await sendOTPEmail(user.email, otp);

    return res.status(200).json({
      message: "OTP sent successfully to reset password.",
      email,
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



/* ============================================================
   6. Reset Password using OTP
============================================================ */
const resetPassword = async (req, res) => {
  try {
    const { email, mobile, otp, newPassword } = req.body;

    if ((!email && !mobile) || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // ✅ Build dynamic condition properly
    const whereCondition = {};
    if (email) whereCondition.email = email;
    if (mobile) whereCondition.mobile = mobile;

    // ✅ Check OTP validity
    const otpRecord = await OTP.findOne({
      where: {
        ...whereCondition,
        otp,
        purpose: "PasswordReset",
        expiresAt: { [Op.gt]: new Date() },
      },
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    // ✅ Find user
    const user = await User.findOne({ where: whereCondition });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 🔐 Hash & update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    // 🧹 Clean OTP
    await OTP.destroy({ where: whereCondition });

    return res.status(200).json({
      message: "Password reset successful. Please login.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



/* ============================================================
   Export Controller Functions
============================================================ */
module.exports = {
  signup,
  verify_otp,
  login,
  forgotPassword,
  resetPassword,
  refreshAccessToken
};
