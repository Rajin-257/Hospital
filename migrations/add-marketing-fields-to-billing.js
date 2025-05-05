'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add marketingManagerId field
    await queryInterface.addColumn('Billings', 'marketingManagerId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    });
    
    // Add referralNote field
    await queryInterface.addColumn('Billings', 'referralNote', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the columns when rolling back the migration
    await queryInterface.removeColumn('Billings', 'marketingManagerId');
    await queryInterface.removeColumn('Billings', 'referralNote');
  }
}; 