const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class UserRole extends Model {
    static associate(models) {
      // Many-to-many relationships already defined in User and Role models
      // But you can add extra associations here if needed
      UserRole.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
      });
      UserRole.belongsTo(models.Role, {
        foreignKey: "roleId",
        as: "role",
      });
    }
  }

  UserRole.init(
    {
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "CASCADE",
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
    },
    {
      sequelize,
      tableName: "UserRole",
      freezeTableName: true,
      modelName: "UserRole",
      timestamps: false,
    }
  );

  return UserRole;
};
