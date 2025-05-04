'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('TestRequests', 'DoctorId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'Doctors',
        key: 'id'
      },
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('TestRequests', 'DoctorId');
  }
}; 