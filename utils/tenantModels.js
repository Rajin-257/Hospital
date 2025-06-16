const { getSequelize } = require('../config/db');
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

// Cache for tenant models to avoid recreating them
const modelCache = new Map();

/**
 * Get a model that's bound to the current tenant database context
 * This ensures all queries use the correct tenant database
 */
const getTenantModel = (modelName, modelDefinition) => {
  const currentSequelize = getSequelize();
  const databaseName = currentSequelize.config?.database || 'default';
  const cacheKey = `${databaseName}-${modelName}`;
  
  // Check if we already have this model for this database
  if (modelCache.has(cacheKey)) {
    return modelCache.get(cacheKey);
  }
  
  // Check if the model already exists in the current sequelize instance
  if (currentSequelize.models[modelName]) {
    modelCache.set(cacheKey, currentSequelize.models[modelName]);
    return currentSequelize.models[modelName];
  }
  
  // If we have a model definition, create the model
  if (modelDefinition) {
    const model = modelDefinition(currentSequelize);
    modelCache.set(cacheKey, model);
    return model;
  }
  
  // Fallback - this shouldn't happen in normal operation
  const fallbackModel = require(`../models/${modelName}`);
  return fallbackModel;
};

/**
 * Get User model for current tenant
 */
const getTenantUser = () => {
  return getTenantModel('User', (sequelize) => {
    const User = sequelize.define('User', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      role: {
        type: DataTypes.ENUM('softadmin', 'admin', 'receptionist', 'doctor', 'laboratorist', 'nurse', 'marketing'),
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    }, {
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        }
      }
    });

    User.prototype.comparePassword = async function(candidatePassword) {
      return await bcrypt.compare(candidatePassword, this.password);
    };

    return User;
  });
};

/**
 * Get Test model for current tenant
 */
const getTenantTest = () => {
  return getTenantModel('Test', (sequelize) => {
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
      }
    });

    return Test;
  });
};

/**
 * Get Setting model for current tenant
 */
const getTenantSetting = () => {
  return getTenantModel('Setting', (sequelize) => {
    const Setting = sequelize.define('Setting', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      medical_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isEmail: true,
        },
      },
      favicon_path: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      import_tast_data: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      import_feature_data: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    }, {
      timestamps: true,
      tableName: 'settings'
    });

    return Setting;
  });
};

/**
 * Clear model cache for a specific database (useful for cleanup)
 */
const clearModelCache = (databaseName) => {
  if (databaseName) {
    // Clear specific database models
    for (const key of modelCache.keys()) {
      if (key.startsWith(databaseName + '-')) {
        modelCache.delete(key);
      }
    }
  } else {
    // Clear all cached models
    modelCache.clear();
  }
};

const getTenantDoctorCommission = () => {
  return getTenantModel('DoctorCommission', (sequelize) => {
    const DoctorCommission = sequelize.define('DoctorCommission', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: DataTypes.ENUM('pending', 'paid'),
        defaultValue: 'pending'
      },
      paidDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      commissionDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    });

    return DoctorCommission;
  });
};

const getTenantTestRequest = () => {
  return getTenantModel('TestRequest', (sequelize) => {
    const TestRequest = sequelize.define('TestRequest', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      requestDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      priority: {
        type: DataTypes.ENUM('Normal', 'Urgent'),
        defaultValue: 'Normal'
      },
      status: {
        type: DataTypes.ENUM('Pending', 'In Progress', 'Completed', 'Delivered', 'Cancelled'),
        defaultValue: 'Pending'
      },
      resultFile: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON string of file paths or single path'
      },
      resultNotes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      completedDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      billingStatus: {
        type: DataTypes.ENUM('billed', 'not_billed'),
        defaultValue: 'not_billed'
      },
      deliveryOption: {
        type: DataTypes.ENUM('Not Collected','Collect', 'Email', 'Home Delivery'),
        defaultValue: 'Not Collected'
      },
      deliveryDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      commission: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    });

    // Add associations - define the foreign keys explicitly
    TestRequest.belongsTo(sequelize.models.Patient || getTenantPatient(), { foreignKey: 'PatientId' });
    TestRequest.belongsTo(sequelize.models.Test || getTenantTest(), { foreignKey: 'TestId' });
    TestRequest.belongsTo(sequelize.models.Doctor || getTenantDoctor(), { foreignKey: 'DoctorId' });

    return TestRequest;
  });
};

const getTenantDoctor = () => {
  return getTenantModel('Doctor', (sequelize) => {
    const Doctor = sequelize.define('Doctor', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      specialization: {
        type: DataTypes.STRING,
        allowNull: false
      },
      qualification: {
        type: DataTypes.STRING,
        allowNull: false
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true
      },
      consultationFee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      isAvailable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    });

    return Doctor;
  });
};

const getTenantPatient = () => {
  return getTenantModel('Patient', (sequelize) => {
    const Patient = sequelize.define('Patient', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      patientId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      gender: {
        type: DataTypes.ENUM('male', 'female', 'other'),
        allowNull: false
      },
      dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true
      },
      address: {
        type: DataTypes.TEXT
      },
      bloodGroup: {
        type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
      }
    });

    return Patient;
  });
};

const getTenantBilling = () => {
  return getTenantModel('Billing', (sequelize) => {
    const Billing = sequelize.define('Billing', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      billDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      discountPercentage: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0
      },
      discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
      },
      netPayable: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      paidAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
      },
      dueAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
      },
      paymentMethod: {
        type: DataTypes.ENUM('cash', 'card', 'mobile banking', 'bank transfer'),
        defaultValue: 'cash'
      },
      status: {
        type: DataTypes.ENUM('paid', 'due'),
        defaultValue: 'due'
      },
      notes: {
        type: DataTypes.TEXT
      },
      marketingManagerId: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    });

    return Billing;
  });
};

module.exports = {
  getTenantModel,
  getTenantUser,
  getTenantTest,
  getTenantSetting,
  clearModelCache,
  getTenantTestRequest,
  getTenantDoctorCommission,
  getTenantDoctor,
  getTenantPatient,
  getTenantBilling
}; 