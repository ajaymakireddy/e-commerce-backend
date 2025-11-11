import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

// Create Sequelize instance
export const sequelize = new Sequelize(
  process.env.DB_NAME,     // Database name
  process.env.DB_USER,     // Username
  process.env.DB_PASS,     // Password
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: true,        // disable SQL logs in console
  }
);

// Test database connection
export async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection has been established successfully.");
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error.message);
  }
}
