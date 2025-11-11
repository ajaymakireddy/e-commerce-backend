import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { sequelize, testConnection } from "./config/db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("✅ E-commerce backend is running successfully!");
});

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await testConnection();             // check connection
    await sequelize.sync({ alter: true });  // sync all models
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
  }
})();
