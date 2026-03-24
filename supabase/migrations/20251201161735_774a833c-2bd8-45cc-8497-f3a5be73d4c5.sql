-- Add commission percentage column to biens table
ALTER TABLE biens ADD COLUMN IF NOT EXISTS commission_pourcentage numeric DEFAULT 10 NOT NULL;