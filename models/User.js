const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
      // A User can have many Roles through UserRole table
      User.belongsToMany(models.Role, {
        through: models.UserRole,
        foreignKey: "userId",
        as: "roles",
      });
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      mobile: {
        type: DataTypes.STRING(15),
        unique: true,
        allowNull: true, // optional for email-only users
        validate: {
          is: /^[0-9]{10,15}$/i, // optional validation pattern
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM("superadmin", "admin", "customer"),
        defaultValue: "customer",
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      refreshToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: "User",
      freezeTableName: true,
      modelName: "User",
      timestamps: true,
    }
  );

  return User;
};
