const { getSequelize } = require('./db');

// Function to sync models with current database
async function syncModels() {
    try {
        const currentSequelize = getSequelize();
        
        // Sync all models with current database
        await currentSequelize.sync();
        
        console.log('Models synchronized with current database');
        return true;
    } catch (error) {
        console.error('Error syncing models:', error);
        return false;
    }
}

// Function to ensure models are available for current database
async function ensureModelsReady() {
    try {
        const currentSequelize = getSequelize();
        
        // Check if models are defined
        const modelNames = Object.keys(currentSequelize.models);
        
        if (modelNames.length === 0) {
            console.log('No models found, they should be auto-loaded');
        } else {
            console.log('Available models:', modelNames);
        }
        
        return true;
    } catch (error) {
        console.error('Error checking models:', error);
        return false;
    }
}

module.exports = {
    syncModels,
    ensureModelsReady
}; 