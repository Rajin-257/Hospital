-- Add invoice_status column to Appointments table
ALTER TABLE Appointments 
ADD COLUMN invoice_status ENUM('pending', 'invoiced') NOT NULL DEFAULT 'pending';

-- Add invoice_status column to LabTests table
ALTER TABLE LabTests 
ADD COLUMN invoice_status ENUM('pending', 'invoiced') NOT NULL DEFAULT 'pending';

-- Add invoice_status column to Cabins table
ALTER TABLE Cabins 
ADD COLUMN invoice_status ENUM('pending', 'invoiced') NOT NULL DEFAULT 'pending';

-- Update all existing records to have invoice_status='pending'
UPDATE Appointments SET invoice_status = 'pending';
UPDATE LabTests SET invoice_status = 'pending';
UPDATE Cabins SET invoice_status = 'pending'; 