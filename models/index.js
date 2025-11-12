"use strict";

const fs = require("fs");
const path = require("path");
const basename = path.basename(__filename);
const db = {};

// ✅ Import the already configured Sequelize instance from db.js
const { sequelize } = require("../config/db.js"); // <-- Important line

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

// ✅ Export models and the shared Sequelize connection
db.sequelize = sequelize;
db.Sequelize = require("sequelize");

module.exports = db;
