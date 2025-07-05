const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const TestDepartment = require('./TestDepartment');

const TestCategory = sequelize.define('TestCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  test_department_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: TestDepartment,
      key: 'id'
    }
  }
});

// Define associations
TestCategory.belongsTo(TestDepartment, { foreignKey: 'test_department_id' });
TestDepartment.hasMany(TestCategory, { foreignKey: 'test_department_id' });

module.exports = TestCategory; 