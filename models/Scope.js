const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class Scope extends Model {
    static associate(models) {
      // A Scope can be linked to many RoleScopes
      Scope.hasMany(models.RoleScope, {
        foreignKey: "scopeId",
        as: "roleScopes",
      });
    }
  }

  Scope.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: "Scope",
      freezeTableName: true,
      modelName: "Scope",
      timestamps: true,
    }
  );

  return Scope;
};
