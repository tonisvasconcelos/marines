-- Migration: Add Ops Sites fields to ports table
-- This migration adds fields needed to support Ops Sites/Zones functionality
-- Run this after the initial ports table creation

-- Add new columns if they don't exist
DO $$ 
BEGIN
  -- Add code column (Ops Site code)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='ports' AND column_name='code') THEN
    ALTER TABLE ports ADD COLUMN code VARCHAR(50);
    CREATE INDEX IF NOT EXISTS idx_ports_code ON ports(code);
  END IF;

  -- Add type column (PORT, TERMINAL, BERTH, ANCHORED_ZONE)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='ports' AND column_name='type') THEN
    ALTER TABLE ports ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'PORT';
    CREATE INDEX IF NOT EXISTS idx_ports_type ON ports(type);
  END IF;

  -- Add polygon column (JSONB for geofence coordinates)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='ports' AND column_name='polygon') THEN
    ALTER TABLE ports ADD COLUMN polygon JSONB;
  END IF;

  -- Add parent_code column (for hierarchical relationships)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='ports' AND column_name='parent_code') THEN
    ALTER TABLE ports ADD COLUMN parent_code VARCHAR(50);
    CREATE INDEX IF NOT EXISTS idx_ports_parent_code ON ports(parent_code);
  END IF;

  -- Update existing rows: set code = unlocode if code is null and unlocode exists
  UPDATE ports SET code = unlocode WHERE code IS NULL AND unlocode IS NOT NULL;
END $$;

