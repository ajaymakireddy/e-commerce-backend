const db = require('../models');
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const { Op } = require('sequelize');

// FIX IMPORTS
const { User, OTP, Role, UserRole, RoleScope, Scope } = db;


/* ============================================================
   Helper: Send OTP Email
============================================================ */
async function sendOTPEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"E-Commerce" <${process.env.EMAIL}>`,
      to: email,
      subject: "Your OTP Code",
      html: `<p>Your OTP is <b>${otp}</b>. It expires in 15 minutes.</p>`,
    });

    console.log(`OTP sent to ${email}`);
  } catch (error) {
    console.error("Email sending failed:", error);
  }
}

/* ============================================================
   1. Generate OTP for Signup
============================================================ */
const signup = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required. Mobile is optional.",
      });
    }

    // Check only by email (PRIMARY IDENTIFIER)
    let user = await User.findOne({ where: { email } });

    // If verified email exists → stop
    if (user && user.isVerified) {
      return res.status(400).json({
        message: "Email already registered. Please login.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Case A: User exists by email but not verified → update
    if (user) {
      await user.update({
        name,
        mobile: mobile || null,
        password: hashedPassword,
        isVerified: false,
      });
    }

    // Case B: User does NOT exist → create new
    else {
      user = await User.create({
        name,
        email,
        mobile: mobile || null,  // mobile optional & no unique validation
        password: hashedPassword,
        isVerified: false,
      });
    }

    // Assign default CUSTOMER role
    const assignedRoles = await user.getRoles();
    if (assignedRoles.length === 0) {
      const customerRole = await Role.findOne({ where: { name: "customer" } });
      await user.addRole(customerRole);
    }

    // Delete old OTPs
    await OTP.destroy({ where: { email, purpose: "Signup" } });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await OTP.create({
      email,
      otp,
      purpose: "Signup",
      expiresAt,
      verified: false,
    });

    // Send OTP email
    await sendOTPEmail(email, otp);

    console.log(`OTP sent to ${email}. OTP: ${otp}`);

    return res.status(200).json({
      message: "OTP sent successfully to your email.",
      email,
    });

  } catch (err) {
    console.error("Signup Error:", err);
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

    // Find OTP
    const otpRecord = await OTP.findOne({
      where: {
        email,
        otp,
        purpose: "Signup",
        verified: false,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    // Fetch user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Mark OTP as verified
    await otpRecord.update({ verified: true });

    // Mark user as verified
    await user.update({ isVerified: true });

    // Get roles with scopes
    const userWithRoles = await User.findByPk(user.id, {
      include: [
        {
          model: Role,
          as: "roles",
          attributes: ["id", "name"],
          include: [
            {
              model: RoleScope,
              as: "scopes",
              include: [{ model: Scope, as: "scope" }]
            }
          ]
        }
      ]
    });

    // Prepare simplified scopes
    const allowedScopes = [];
    userWithRoles.roles.forEach(role => {
      role.scopes.forEach(rs => {
        allowedScopes.push(rs.scope.name);
      });
    });

    // Generate tokens  
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roles: userWithRoles.roles.map(r => r.name),
        scopes: allowedScopes
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Save refresh token
    await user.update({ refreshToken });

    return res.status(200).json({
      message: "OTP verified successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        roles: userWithRoles.roles.map(r => r.name),
        scopes: allowedScopes,
        isVerified: true
      },
      tokens: { accessToken, refreshToken }
    });

  } catch (err) {
    console.error("Verify OTP Error:", err);
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
   Create Admin (ONLY SuperAdmin can do this)
============================================================ */
const createAdmin = async (req, res) => {
  try {
    const { name, email, password, mobile } = req.body;

    // Required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    // Check email exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists.",
      });
    }

    // Encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const newAdmin = await User.create({
      name,
      email,
      mobile: mobile || null,
      password: hashedPassword,
      isVerified: true,   // Admin doesn't need OTP
      role: "admin",
    });

    // Assign admin role in Role table
    const adminRole = await Role.findOne({ where: { name: "admin" } });

    if (adminRole) {
      await UserRole.create({
        userId: newAdmin.id,
        roleId: adminRole.id,
      });
    }

    return res.status(201).json({
      message: "Admin created successfully.",
      admin: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        mobile: newAdmin.mobile,
        role: "admin",
      },
    });

  } catch (error) {
    console.error("Create Admin Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


/* ============================================================
   Update Role (Admin <-> Customer)
============================================================ */
const updateRole = async (req, res) => {
  try {
    const { userId } = req.params;  // user ID to update
    const { newRole } = req.body;   // "admin" or "customer"

    if (!newRole || !["admin", "customer"].includes(newRole)) {
      return res.status(400).json({ message: "Invalid role. Use 'admin' or 'customer'." });
    }

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Fetch roles from DB
    const adminRole = await Role.findOne({ where: { name: "admin" } });
    const customerRole = await Role.findOne({ where: { name: "customer" } });

    if (!adminRole || !customerRole) {
      return res.status(500).json({ message: "Role definitions missing in DB." });
    }

    // Remove all old roles from UserRole table
    await UserRole.destroy({ where: { userId: user.id } });

    // Assign new role mapping
    const selectedRole = newRole === "admin" ? adminRole : customerRole;
    await UserRole.create({ userId: user.id, roleId: selectedRole.id });

    // Update role field in User table to sync enums
    await user.update({ role: newRole });

    return res.status(200).json({
      message: `Role updated to ${newRole} successfully.`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: newRole,
      },
    });

  } catch (error) {
    console.error("Update Role Error:", error);
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
  refreshAccessToken,
  createAdmin,
  updateRole
};
