'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('RoleScope', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      roleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Role',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      scopeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Scope',
          key: 'id'
        },
        onDelete: 'CASCADE'
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

    await queryInterface.addIndex('RoleScope', ['roleId']);
    await queryInterface.addIndex('RoleScope', ['scopeId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('RoleScope');
  }
};
