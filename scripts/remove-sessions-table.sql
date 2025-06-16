-- ========================================
-- Migration Script: Remove Sessions Table
-- ========================================
-- This script removes the sessions table as the application
-- now uses JWT-based authentication instead of sessions.

USE hospital_management;

-- Check if sessions table exists and drop it
DROP TABLE IF EXISTS `sessions`;

-- Clean up any session-related data or references
-- (No foreign key references to sessions table exist in the schema)

-- Print confirmation
SELECT 'Sessions table removed successfully - JWT authentication is now active' AS Status; 