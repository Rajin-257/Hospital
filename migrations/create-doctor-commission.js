'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('DoctorCommissions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('pending', 'paid'),
        defaultValue: 'pending'
      },
      paidDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      commissionDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      DoctorId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Doctors',
          key: 'id'
        },
        allowNull: false
      },
      TestId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Tests',
          key: 'id'
        },
        allowNull: false
      },
      TestRequestId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'TestRequests',
          key: 'id'
        },
        allowNull: false
      },
      BillingId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Billings',
          key: 'id'
        },
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('DoctorCommissions');
  }
}; 