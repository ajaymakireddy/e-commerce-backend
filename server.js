require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const session = require("express-session");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const router = require("./routes");
const { sequelize, testConnection, setCurrentRoute } = require("./config/db");


//from client express receives the request here
const app = express();
const PORT = process.env.PORT || 4000;

// FIX FOR RATE-LIMIT ERROR
app.set("trust proxy", 1);   // <--- ADD THIS LINE


//Then this is the 1st place every request comes here
// Middleware setup
app.use(cors());
//This line will read every request body
app.use(express.json());
// This line prints the status of the request
app.use(morgan("dev"));
// Adds security to the header part
app.use(helmet());
//Adds session cookies
app.use(session({
  secret: process.env.SESSION_SECRET || "my$eCreTKeY",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
  },
}));



// Generate per-request nonce (security)
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
});


//It prevents a user from hitting the server too many times in a short time. If limit is crossed → request is blocked
// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Too many requests, please try again later.",
});
app.use(limiter);


//This will show which API triggered which SQL query 
// 👇 NEW Middleware: Label SQL logs with current route
app.use((req, res, next) => {
  const method = req.method.toUpperCase();
  const path = req.originalUrl.split("?")[0];
  setCurrentRoute(`${method} ${path}`);
  next();
});

//Testing purpose written this API
// Default route
app.get("/", (req, res) => {
  res.send("✅ E-Commerce Authentication API is Running!");
});

//This is the main point which sends the request to routes(index.js)
// Mount routes
app.use("/", router);

// Start server
(async () => {
  try {
    await testConnection();
    await sequelize.sync();
    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  } catch (error) {
    console.error("❌ Failed to start server:", error);
  }
})();
