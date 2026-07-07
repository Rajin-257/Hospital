const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Billing = require('./Billing');
const User = require('./User');

const AiPortraitJob = sequelize.define('AiPortraitJob', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  batchId: {
    type: DataTypes.STRING(36),
    allowNull: false
  },
  billingId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'skipped'),
    allowNull: false,
    defaultValue: 'pending'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  imageUrlJpg: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

AiPortraitJob.belongsTo(Billing, { foreignKey: 'billingId' });
AiPortraitJob.belongsTo(User, { as: 'requestedBy', foreignKey: 'userId' });

module.exports = AiPortraitJob;
