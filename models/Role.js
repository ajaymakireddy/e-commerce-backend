const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class Role extends Model {
    static associate(models) {
      // Role can belong to many Users through UserRole table
      Role.belongsToMany(models.User, {
        through: models.UserRole,
        foreignKey: "roleId",
        as: "users",
      });

      // Role can have many RoleScopes
      Role.hasMany(models.RoleScope, {
        foreignKey: "roleId",
        as: "scopes",
      });
    }
  }

  Role.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
    },
    {
      sequelize,
      tableName: "Roles",
      freezeTableName: true,
      modelName: "Role",
      timestamps: true,
    }
  );

  return Role;
};
