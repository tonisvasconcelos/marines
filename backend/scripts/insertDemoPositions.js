/**
 * Script to insert demo vessel positions into the database
 * This ensures vessels appear on the dashboard map
 */

import { query } from '../db/connection.js';

/**
 * Insert demo positions for vessels
 * Based on the provided demo data: AKOFS SANTOS
 */
async function insertDemoPositions() {
  try {
    // Get the tenant ID from environment or use a default
    const tenantId = process.env.DEMO_TENANT_ID || 'demo-tenant';
    
    console.log('Inserting demo positions for tenant:', tenantId);
    
    // First, find the vessel by IMO or name
    const vesselResult = await query(
      `SELECT id, name, imo, mmsi FROM vessels 
       WHERE tenant_id = $1 
       AND (imo = $2 OR mmsi = $3 OR name ILIKE $4)
       LIMIT 1`,
      [tenantId, '9423437', '710005865', '%AKOFS SANTOS%']
    );
    
    if (vesselResult.rows.length === 0) {
      console.log('No vessel found with IMO 9423437, MMSI 710005865, or name containing "AKOFS SANTOS"');
      console.log('Please create the vessel first or update the script with the correct vessel ID');
      return;
    }
    
    const vessel = vesselResult.rows[0];
    console.log(`Found vessel: ${vessel.name} (ID: ${vessel.id}, IMO: ${vessel.imo}, MMSI: ${vessel.mmsi})`);
    
    // Demo positions from the provided data (latest first)
    const positions = [
      {
        lat: -24.481873,
        lon: -44.217957,
        timestamp: '2025-12-12T20:50:19.000Z',
        course: 200,
        heading: 200,
        speed: null,
      },
      {
        lat: -22.822765,
        lon: -43.141867,
        timestamp: '2025-12-11T19:37:47.000Z',
        course: 180,
        heading: 180,
        speed: null,
      },
      {
        lat: -22.822765,
        lon: -43.141852,
        timestamp: '2025-12-11T19:13:01.000Z',
        course: 180,
        heading: 180,
        speed: null,
      },
    ];
    
    // Insert positions (starting with the latest)
    for (const pos of positions) {
      const positionId = `pos-${vessel.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        await query(
          `INSERT INTO vessel_position_history (
            id, vessel_id, tenant_id, lat, lon, timestamp, 
            sog, cog, heading, nav_status, source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT DO NOTHING`,
          [
            positionId,
            vessel.id,
            tenantId,
            pos.lat,
            pos.lon,
            pos.timestamp,
            pos.speed,
            pos.course,
            pos.heading,
            'AT_SEA',
            'demo',
          ]
        );
        console.log(`✅ Inserted position: ${pos.lat}, ${pos.lon} at ${pos.timestamp}`);
      } catch (error) {
        if (error.message?.includes('duplicate') || error.code === '23505') {
          console.log(`⚠️ Position already exists: ${pos.lat}, ${pos.lon}`);
        } else {
          console.error(`❌ Error inserting position:`, error.message);
        }
      }
    }
    
    console.log('✅ Demo positions inserted successfully');
    console.log(`Vessel ${vessel.name} should now appear on the dashboard map`);
    
  } catch (error) {
    console.error('❌ Error inserting demo positions:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  insertDemoPositions()
    .then(() => {
      console.log('Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { insertDemoPositions };

