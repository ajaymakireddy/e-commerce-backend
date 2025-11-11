const db = require('../models');
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const moment = require('moment');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

// Import Models
const { User, OTP } = db;


// OTP valid for 5 minutes
const OTP_EXPIRY_MINUTES = 5;



/* ============================================================
   Helper: Send OTP Email
============================================================ */
async function sendOTPEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASSWORD }
    });

    const options = {
      from: `"E-Commerce" <${process.env.EMAIL}>`,
      to: email,
      subject: 'Your OTP Code',
      html: `<p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p>`
    };

    await transporter.sendMail(options);
    console.log(`OTP sent to ${email}`);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
}


/* ============================================================
   1️⃣ Generate OTP for Signup
============================================================ */
const signup = async (req, res) => {
  try {
    const { name, email, mobile } = req.body;
    if (!name || (!email && !mobile)) {
      return res.status(400).json({ message: 'Name and email or mobile number are required.' });
    }

    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email }, { mobile }] }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists. Please login.' });
    }

    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
    const expiresAt = moment().add(OTP_EXPIRY_MINUTES, 'minutes').toDate();

    await OTP.create({ email, otp, expiresAt, purpose: 'Signup' });

    if (email) await sendOTPEmail(email, otp);

    return res.status(200).json({ message: 'OTP sent successfully for account verification.' });
  } catch (error) {
    console.error('Signup OTP Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

/* ============================================================
   2️⃣ Verify OTP & Create Account
============================================================ */
const verify_otp = async (req, res) => {
  try {
    const { name, email, mobile, password, otp } = req.body;
    if (!name || !password || !otp || (!email && !mobile)) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const otpRecord = await OTP.findOne({
      where: {
        [Op.or]: [{ email }, { mobile }],
        otp,
        purpose: 'Signup',
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      mobile,
      password: hashedPassword,
      isVerified: true,
      role: 'customer'
    });

    await OTP.destroy({ where: { [Op.or]: [{ email }, { mobile }] } });

    return res.status(201).json({
      message: 'Account created successfully. Please login.',
      user: { id: newUser.id, name: newUser.name, email: newUser.email, mobile: newUser.mobile }
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

/* ============================================================
   3️⃣ Login (Email or Mobile + Password)
============================================================ */
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier = email or mobile
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email/Mobile and password are required.' });
    }

    const user = await User.findOne({
      where: { [Op.or]: [{ email: identifier }, { mobile: identifier }] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

/* ============================================================
   4️⃣ Forgot Password → Generate OTP
============================================================ */
const forgotPassword = async (req, res) => {
  try {
    const { email, mobile } = req.body;
    if (!email && !mobile) {
      return res.status(400).json({ message: 'Email or mobile is required.' });
    }

    const user = await User.findOne({ where: { [Op.or]: [{ email }, { mobile }] } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
    const expiresAt = moment().add(OTP_EXPIRY_MINUTES, 'minutes').toDate();

    await OTP.create({ email, otp, expiresAt, purpose: 'ForgotPassword' });

    if (email) await sendOTPEmail(email, otp);

    return res.status(200).json({ message: 'OTP sent successfully to reset password.' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

/* ============================================================
   5️⃣ Reset Password using OTP
============================================================ */
const resetPassword = async (req, res) => {
  try {
    const { email, mobile, otp, newPassword } = req.body;
    if ((!email && !mobile) || !otp || !newPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const otpRecord = await OTP.findOne({
      where: {
        [Op.or]: [{ email }, { mobile }],
        otp,
        purpose: 'ForgotPassword',
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const user = await User.findOne({ where: { [Op.or]: [{ email }, { mobile }] } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    await OTP.destroy({ where: { [Op.or]: [{ email }, { mobile }] } });

    return res.status(200).json({ message: 'Password reset successful. Please login.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
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
  resetPassword
};
