require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const session = require("express-session");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const router = require("./routes");
const { sequelize, testConnection } = require("./config/db");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(helmet());
app.use(session({
  secret: process.env.SESSION_SECRET || "my$eCreTKeY",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

// Generate per-request nonce (security)
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
});

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Too many requests, please try again later."
});
app.use(limiter);

// Default route
app.get("/", (req, res) => {
  res.send("✅ E-Commerce Authentication API is Running!");
});

// Mount routes
app.use("/", router);

// Start server
(async () => {
  try {
    await testConnection();
    await sequelize.sync({ alter: true });
    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  } catch (error) {
    console.error("❌ Failed to start server:", error);
  }
})();
