import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import chalk from "chalk";

dotenv.config();

// Track current route for SQL logging
let currentRoute = "";
export function setCurrentRoute(route) {
  currentRoute = route;
}

// Create Sequelize instance
export const sequelize = new Sequelize(
  process.env.DB_NAME,     // Database name
  process.env.DB_USER,     // Username
  process.env.DB_PASS,     // Password
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: (msg) => {
      const prefix = currentRoute ? chalk.yellow(`[${currentRoute}]`) : "";
      console.log(prefix, chalk.cyanBright("[SQL]"), chalk.gray(msg));
    },
  }
);

// Test database connection
export async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log(chalk.green("✅ Database connection has been established successfully."));
  } catch (error) {
    console.error(chalk.red("❌ Unable to connect to the database:"), error.message);
  }
}
