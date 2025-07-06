const { getSequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

/**
 * Create print_template table across all tenant databases
 */
const createPrintTemplateTable = async () => {
    try {
        console.log('🔄 Starting print_template table creation...');
        
        const sequelize = getSequelize();
        
        if (!sequelize) {
            throw new Error('No database connection available');
        }
        
        const tableName = 'print_template';
        
        // Check if table already exists
        const [results] = await sequelize.query(`SHOW TABLES LIKE '${tableName}'`);
        
        if (results.length > 0) {
            console.log(`⚠️ Table ${tableName} already exists. Skipping creation.`);
            return {
                success: true,
                message: `Table ${tableName} already exists`,
                database: sequelize.config.database
            };
        }
        
        // Create the table using raw SQL to match the exact schema provided
        const createTableSQL = `
            CREATE TABLE ${tableName} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(50) NOT NULL,
                header_img TEXT,
                header_width INT,
                header_height INT,
                footer_image TEXT,
                footer_width INT,
                footer_height INT,
                status ENUM('active', 'inactive') DEFAULT 'inactive',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_name (name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        await sequelize.query(createTableSQL);
        
        console.log(`✅ Successfully created table ${tableName} in database: ${sequelize.config.database}`);
        
        return {
            success: true,
            message: `Table ${tableName} created successfully`,
            database: sequelize.config.database
        };
        
    } catch (error) {
        console.error('❌ Error creating print_template table:', error);
        throw error;
    }
};

/**
 * Drop print_template table (for rollback purposes)
 */
const dropPrintTemplateTable = async () => {
    try {
        console.log('🔄 Dropping print_template table...');
        
        const sequelize = getSequelize();
        
        if (!sequelize) {
            throw new Error('No database connection available');
        }
        
        await sequelize.query('DROP TABLE IF EXISTS print_template');
        
        console.log(`✅ Successfully dropped table print_template from database: ${sequelize.config.database}`);
        
        return {
            success: true,
            message: 'Table print_template dropped successfully',
            database: sequelize.config.database
        };
        
    } catch (error) {
        console.error('❌ Error dropping print_template table:', error);
        throw error;
    }
};

/**
 * Insert sample print template data
 */
const insertSampleData = async () => {
    try {
        console.log('🔄 Inserting sample print template data...');
        
        const sequelize = getSequelize();
        
        if (!sequelize) {
            throw new Error('No database connection available');
        }
        
        const sampleTemplates = [
            {
                name: 'Default Hospital Template',
                status: 'active',
                header_width: 800,
                header_height: 120,
                footer_width: 800,
                footer_height: 80
            },
            {
                name: 'Lab Report Template',
                status: 'inactive',
                header_width: 750,
                header_height: 100,
                footer_width: 750,
                footer_height: 60
            }
        ];
        
        for (const template of sampleTemplates) {
            await sequelize.query(`
                INSERT INTO print_template (name, status, header_width, header_height, footer_width, footer_height)
                VALUES (?, ?, ?, ?, ?, ?)
            `, {
                replacements: [
                    template.name,
                    template.status,
                    template.header_width,
                    template.header_height,
                    template.footer_width,
                    template.footer_height
                ]
            });
        }
        
        console.log(`✅ Successfully inserted ${sampleTemplates.length} sample templates`);
        
        return {
            success: true,
            message: `Inserted ${sampleTemplates.length} sample templates`,
            count: sampleTemplates.length
        };
        
    } catch (error) {
        console.error('❌ Error inserting sample data:', error);
        throw error;
    }
};

// Export functions
module.exports = {
    createPrintTemplateTable,
    dropPrintTemplateTable,
    insertSampleData
};

// If this script is run directly
if (require.main === module) {
    (async () => {
        try {
            const action = process.argv[2] || 'create';
            
            switch (action) {
                case 'create':
                    await createPrintTemplateTable();
                    break;
                    
                case 'drop':
                    await dropPrintTemplateTable();
                    break;
                    
                case 'sample':
                    await insertSampleData();
                    break;
                    
                case 'full':
                    await createPrintTemplateTable();
                    await insertSampleData();
                    break;
                    
                default:
                    console.log('Usage: node create-print-template-table.js [create|drop|sample|full]');
                    console.log('  create - Create the print_template table');
                    console.log('  drop   - Drop the print_template table');
                    console.log('  sample - Insert sample data');
                    console.log('  full   - Create table and insert sample data');
            }
            
            process.exit(0);
        } catch (error) {
            console.error('Script execution failed:', error);
            process.exit(1);
        }
    })();
} 