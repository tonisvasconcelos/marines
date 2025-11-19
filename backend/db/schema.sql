-- Vessels Table
-- Stores vessel information with multi-tenant support
CREATE TABLE IF NOT EXISTS vessels (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  imo VARCHAR(50),
  mmsi VARCHAR(50),
  call_sign VARCHAR(50),
  flag VARCHAR(10),
  type VARCHAR(100),
  length DECIMAL(10, 2),
  width DECIMAL(10, 2),
  draft DECIMAL(10, 2),
  gross_tonnage DECIMAL(10, 2),
  net_tonnage DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on tenant_id for faster queries
CREATE INDEX IF NOT EXISTS idx_vessels_tenant_id ON vessels(tenant_id);

-- Create index on IMO and MMSI for AIS lookups
CREATE INDEX IF NOT EXISTS idx_vessels_imo ON vessels(imo);
CREATE INDEX IF NOT EXISTS idx_vessels_mmsi ON vessels(mmsi);

-- Vessel Position History Table
-- Stores historical AIS position data
CREATE TABLE IF NOT EXISTS vessel_position_history (
  id VARCHAR(255) PRIMARY KEY,
  vessel_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lon DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  sog DECIMAL(5, 2), -- Speed over ground (knots)
  cog DECIMAL(5, 2), -- Course over ground (degrees)
  heading DECIMAL(5, 2), -- Heading (degrees)
  nav_status VARCHAR(50),
  source VARCHAR(50) DEFAULT 'ais',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vessel_id) REFERENCES vessels(id) ON DELETE CASCADE
);

-- Create indexes for position history
CREATE INDEX IF NOT EXISTS idx_position_history_vessel_id ON vessel_position_history(vessel_id);
CREATE INDEX IF NOT EXISTS idx_position_history_tenant_id ON vessel_position_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_position_history_timestamp ON vessel_position_history(timestamp DESC);

-- Vessel-Customer Associations Table
CREATE TABLE IF NOT EXISTS vessel_customer_associations (
  id VARCHAR(255) PRIMARY KEY,
  vessel_id VARCHAR(255) NOT NULL,
  customer_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vessel_id) REFERENCES vessels(id) ON DELETE CASCADE,
  UNIQUE(vessel_id, customer_id, tenant_id)
);

-- Create indexes for associations
CREATE INDEX IF NOT EXISTS idx_vca_vessel_id ON vessel_customer_associations(vessel_id);
CREATE INDEX IF NOT EXISTS idx_vca_customer_id ON vessel_customer_associations(customer_id);
CREATE INDEX IF NOT EXISTS idx_vca_tenant_id ON vessel_customer_associations(tenant_id);

-- Vessel-Agent Associations Table
CREATE TABLE IF NOT EXISTS vessel_agent_associations (
  id VARCHAR(255) PRIMARY KEY,
  vessel_id VARCHAR(255) NOT NULL,
  agent_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vessel_id) REFERENCES vessels(id) ON DELETE CASCADE,
  UNIQUE(vessel_id, agent_id, tenant_id)
);

-- Create indexes for agent associations
CREATE INDEX IF NOT EXISTS idx_vaa_vessel_id ON vessel_agent_associations(vessel_id);
CREATE INDEX IF NOT EXISTS idx_vaa_agent_id ON vessel_agent_associations(agent_id);
CREATE INDEX IF NOT EXISTS idx_vaa_tenant_id ON vessel_agent_associations(tenant_id);

-- Port Call Operation Logs Table
-- Stores operational events for vessels (creation, position updates, geofence entries, status changes)
CREATE TABLE IF NOT EXISTS portcall_operation_logs (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  vessel_id VARCHAR(255),
  event_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  position_lat DECIMAL(10, 8),
  position_lon DECIMAL(11, 8),
  previous_status VARCHAR(50),
  current_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vessel_id) REFERENCES vessels(id) ON DELETE SET NULL
);

-- Create indexes for operation logs
CREATE INDEX IF NOT EXISTS idx_operation_logs_tenant_id ON portcall_operation_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_vessel_id ON portcall_operation_logs(vessel_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_event_type ON portcall_operation_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_operation_logs_timestamp ON portcall_operation_logs(timestamp DESC);

