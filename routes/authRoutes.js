const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const verify_jwt = require("../middleware/verifyJwt");

// Account creation & verification
router.post("/signup", authController.signup);
router.post("/verify", authController.verify_otp);

router.post("/refresh", authController.refreshAccessToken);


// Login
router.post("/login", authController.login);

// Forgot / Reset password
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Optional: Secure endpoints (protected)
router.get("/profile", verify_jwt, (req, res) => {
  res.json({ message: "Authenticated route working", user: req.user });
});

module.exports = router;
