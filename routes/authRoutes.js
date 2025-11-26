const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const verify_jwt = require("../middleware/verifyJwt");
const verifyAccess = require("../middleware/verifyAccess");

// ================= Create Admin (SuperAdmin Only) =================
router.post(
  "/create-admin",
  verify_jwt,
  verifyAccess(["admin.create"]),
  authController.createAdmin
);

// ================= Update Role API =================
router.put(
  "/update-role/:userId",
  verify_jwt,
  authController.updateRole
);


// ================= Account creation & verification =================
router.post("/signup", authController.signup);
router.post("/verify", authController.verify_otp);

// ================= Refresh Token =================
router.post("/refresh", authController.refreshAccessToken);

// ================= Login =================
router.post("/login", authController.login);

// ================= Forgot / Reset Password =================
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// ================= Authenticated profile route =================
router.get("/profile", verify_jwt, (req, res) => {
  res.json({ message: "Authenticated route working", user: req.user });
});

module.exports = router;
