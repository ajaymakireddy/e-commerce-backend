module.exports = (req, res, next) => {
  try {
    const allowedSuperAdmins = [
      "kourwarsaisaraswathi@gmailcom", 
    ];

    if (!req.user || !allowedSuperAdmins.includes(req.user.email)) {
      return res
        .status(403)
        .json({ message: "SuperAdmin access required" });
    }

    next();
  } catch (err) {
    console.error("❌ superAdmin middleware error:", err.message);
    res.status(500).json({ message: "Error verifying SuperAdmin access" });
  }
};
