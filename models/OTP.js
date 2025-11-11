const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class OTP extends Model {
    static associate(models) {
      // Example association (optional): If OTP belongs to a User
      // OTP.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    }
  }

  OTP.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      otp: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      purpose: {
        type: DataTypes.ENUM("Signup", "Login", "PasswordReset"),
        defaultValue: "Signup",
      },
    },
    {
      sequelize,
      tableName: "OTP",
      freezeTableName: true,
      modelName: "OTP",
      timestamps: true,
    }
  );

  return OTP;
};
