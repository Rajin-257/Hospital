const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const TestGroup = require('./TestGroup');

const Test = sequelize.define('Test', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  commission: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  test_group_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: TestGroup,
      key: 'id'
    }
  },
  unit: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  bilogical_ref_range: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
});

// Define associations
Test.belongsTo(TestGroup, { foreignKey: 'test_group_id' });
TestGroup.hasMany(Test, { foreignKey: 'test_group_id' });

module.exports = Test;