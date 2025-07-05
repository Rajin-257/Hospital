const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TestDepartment = sequelize.define('TestDepartment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
});

module.exports = TestDepartment; 