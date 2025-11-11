const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class RoleScope extends Model {
    static associate(models) {
      // RoleScope belongs to a Role
      RoleScope.belongsTo(models.Role, {
        foreignKey: "roleId",
        as: "role",
      });

      // RoleScope belongs to a Scope
      RoleScope.belongsTo(models.Scope, {
        foreignKey: "scopeId",
        as: "scope",
      });
    }
  }

  RoleScope.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      roleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Roles",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      scopeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Scope",
          key: "id",
        },
        onDelete: "CASCADE",
      },
    },
    {
      sequelize,
      tableName: "RoleScope",
      freezeTableName: true,
      modelName: "RoleScope",
      timestamps: true,
    }
  );

  return RoleScope;
};
