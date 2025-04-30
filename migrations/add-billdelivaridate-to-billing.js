'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Billings', 'billdelivaridate', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Billings', 'billdelivaridate');
  }
}; 