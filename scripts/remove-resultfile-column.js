const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/saas-config');

async function removeResultFileColumn() {
  console.log('Starting migration: Remove resultFile column from TestRequest tables');
  
  const tenants = [
    { name: 'tenant1', database: 'hospital_tenant1' },
    { name: 'tenant2', database: 'hospital_tenant2' },
    { name: 'tenant3', database: 'hospital_tenant3' }
  ];
  
  for (const tenant of tenants) {
    try {
      console.log(`\n=== Processing tenant: ${tenant.name} ===`);
      
      // Create database connection for this tenant
      const sequelize = new Sequelize(tenant.database, config.database.username, config.database.password, {
        host: config.database.host,
        dialect: config.database.dialect,
        logging: false, // Disable logging for cleaner output
        dialectOptions: {
          charset: 'utf8',
          collate: 'utf8_unicode_ci'
        }
      });
      
      // Test connection
      await sequelize.authenticate();
      console.log(`✓ Connected to ${tenant.database}`);
      
      // Check if the column exists
      const queryInterface = sequelize.getQueryInterface();
      const tableDescription = await queryInterface.describeTable('TestRequests');
      
      if (tableDescription.resultFile) {
        console.log(`✓ resultFile column found in ${tenant.database}`);
        
        // Remove the column
        await queryInterface.removeColumn('TestRequests', 'resultFile');
        console.log(`✓ Successfully removed resultFile column from ${tenant.database}`);
      } else {
        console.log(`• resultFile column not found in ${tenant.database} - skipping`);
      }
      
      // Close connection
      await sequelize.close();
      
    } catch (error) {
      console.error(`✗ Error processing tenant ${tenant.name}:`, error.message);
      
      // If database doesn't exist, that's okay - continue with other tenants
      if (error.message.includes('Unknown database')) {
        console.log(`• Database ${tenant.database} doesn't exist - skipping`);
        continue;
      }
      
      // For other errors, we might want to continue or stop
      console.error('Full error:', error);
    }
  }
  
  console.log('\n=== Migration completed ===');
}

// Run the migration
if (require.main === module) {
  removeResultFileColumn()
    .then(() => {
      console.log('\n✓ Migration script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n✗ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = removeResultFileColumn; 