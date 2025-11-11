const fs = require("fs");
const path = require("path");
const { Sequelize } = require("sequelize");
require("dotenv").config();

const basename = path.basename(__filename);
const db = {};

// ✅ Initialize Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 5432,
    dialect: process.env.DB_DIALECT || "postgres",
    logging: false,
  }
);

// ✅ Dynamically import all models in this folder
fs.readdirSync(__dirname)
  .filter(
    (file) =>
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js"
  )
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize);
    db[model.name] = model;
  });

// ✅ Setup model associations (if defined)
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// ✅ Export Sequelize connection and models
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
