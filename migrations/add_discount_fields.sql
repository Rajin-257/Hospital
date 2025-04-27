-- Add discount fields to the Billings table
ALTER TABLE Billings 
ADD COLUMN discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN discountType ENUM('percentage', 'fixed') NOT NULL DEFAULT 'fixed',
ADD COLUMN discountedAmount DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Update existing records to have discountedAmount match totalAmount
UPDATE Billings 
SET discountedAmount = totalAmount
WHERE discountedAmount = 0; 