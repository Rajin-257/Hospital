const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Cabin = sequelize.define('Cabin', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cabinNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  cabinType: {
    type: DataTypes.ENUM('VIP', 'Deluxe', 'Regular'),
    allowNull: false
  },
  pricePerDay: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Available', 'Occupied', 'Maintenance'),
    defaultValue: 'Available'
  },
  description: {
    type: DataTypes.TEXT
  }
});

module.exports = Cabin;