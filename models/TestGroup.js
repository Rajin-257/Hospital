const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const TestCategory = require('./TestCategory');

const TestGroup = sequelize.define('TestGroup', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  test_category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: TestCategory,
      key: 'id'
    }
  }
});

// Define associations
TestGroup.belongsTo(TestCategory, { foreignKey: 'test_category_id' });
TestCategory.hasMany(TestGroup, { foreignKey: 'test_category_id' });

module.exports = TestGroup; 