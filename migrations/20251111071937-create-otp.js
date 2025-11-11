'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('OTP', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      otp: {
        type: Sequelize.STRING,
        allowNull: false
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      purpose: {
        type: Sequelize.ENUM('Signup', 'Login', 'PasswordReset'),
        allowNull: false,
        defaultValue: 'Signup'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('OTP', ['email']);
    await queryInterface.addIndex('OTP', ['purpose']);
    await queryInterface.addIndex('OTP', ['verified']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('OTP');
  }
};
