const express = require("express");
const authRoutes = require("./authRoutes");
// const productRoutes = require("./productRoutes");
// const customerRoutes = require("./customerRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
// router.use("/products", productRoutes);
// router.use("/customers", customerRoutes);

module.exports = router;
