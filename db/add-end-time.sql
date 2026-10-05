-- Add end_time column
ALTER TABLE bookings ADD end_time DATETIME2;
GO

-- Populate existing records (assuming 2 hours duration based on old logic)
UPDATE bookings SET end_time = DATEADD(hour, 2, slot) WHERE end_time IS NULL;
GO

-- Optional: Alter column to be NOT NULL if desired, but we can just leave it as nullable for now.
