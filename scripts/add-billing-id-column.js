const { sequelize } = require('../config/db');

/**
 * Migration script to add billing_id column to TestRequest table
 */
async function addBillingIdColumn() {
  try {
    console.log('Starting migration: Add billing_id column to TestRequest table');
    
    // Check if the column already exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'TestRequests' 
      AND COLUMN_NAME = 'billing_id'
    `);
    
    if (results.length > 0) {
      console.log('Column billing_id already exists in TestRequests table');
      return;
    }
    
    // Add the billing_id column
    await sequelize.query(`
      ALTER TABLE TestRequests 
      ADD COLUMN billing_id INTEGER NULL,
      ADD CONSTRAINT fk_testrequest_billing 
      FOREIGN KEY (billing_id) REFERENCES Billings(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE
    `);
    
    console.log('Successfully added billing_id column to TestRequests table');
    
    // Update existing billed test requests to associate with their billing records
    console.log('Updating existing test requests with billing associations...');
    
    // This is a complex query that tries to associate test requests with billing records
    // based on patient, test, and date matching
    await sequelize.query(`
      UPDATE TestRequests tr
      SET billing_id = (
        SELECT b.id
        FROM Billings b
        WHERE b.PatientId = tr.PatientId
        AND DATE(b.billDate) = DATE(tr.requestDate)
        AND tr.billingStatus = 'billed'
        AND JSON_EXTRACT(b.items, '$[*].id') LIKE CONCAT('%', tr.TestId, '%')
        AND JSON_EXTRACT(b.items, '$[*].type') LIKE '%test%'
        ORDER BY b.id DESC
        LIMIT 1
      )
      WHERE tr.billingStatus = 'billed' AND tr.billing_id IS NULL
    `);
    
    console.log('Migration completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  addBillingIdColumn()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { addBillingIdColumn }; 