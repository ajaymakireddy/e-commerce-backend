const jwt = require("jsonwebtoken");
const db = require("../models");
const { decryptPayload } = require("../utils/jwtCryptoHelper");

const { User } = db;

/**
 * Middleware to verify JWT and attach user data to req.user
 */
module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ message: "Authorization header missing" });

    const token = authHeader.split(" ")[1];
    if (!token)
      return res.status(401).json({ message: "Token not provided" });

    // ✅ Verify token signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Decrypt user data from token payload
    const decryptedData = decoded.encryptedData
      ? decryptPayload(decoded.encryptedData)
      : decoded;

    // ✅ Find user from DB
    const user = await User.findByPk(decryptedData.id);
    if (!user)
      return res.status(401).json({ message: "User not found or invalid token" });

    // ✅ Attach user info to request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error("❌ verifyJwt error:", err.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
