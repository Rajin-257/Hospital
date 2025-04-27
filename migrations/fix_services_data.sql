-- This migration script fixes the service data format in the Billing table
-- It will parse and re-save any double-stringified JSON data

-- First, create a backup table
CREATE TABLE Billing_Backup LIKE Billings;
INSERT INTO Billing_Backup SELECT * FROM Billings;

-- Fix the services data - this depends on your database system
-- For MySQL:
UPDATE Billings
SET services = 
  CASE 
    WHEN services LIKE '\"[%' OR services LIKE '\'[%' THEN
      -- This indicates double-stringified JSON, so we need to parse it and re-stringify it
      JSON_EXTRACT(services, '$')
    ELSE
      -- Already in the correct format
      services
  END;

-- Fix the insuranceDetails data in a similar way
UPDATE Billings
SET insuranceDetails = 
  CASE 
    WHEN insuranceDetails LIKE '\"{%' OR insuranceDetails LIKE '\'{%' THEN
      -- This indicates double-stringified JSON
      JSON_EXTRACT(insuranceDetails, '$')
    ELSE
      -- Already in the correct format
      insuranceDetails
  END
WHERE insuranceDetails IS NOT NULL; 