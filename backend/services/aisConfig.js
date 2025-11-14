/**
 * Shared AIS Configuration Service
 * Persists data to a JSON file for persistence across server restarts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, '../data/aisConfig.json');

const aisConfigs = new Map();

// Load configurations from file on startup
async function loadConfigs() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    const configs = JSON.parse(data);
    Object.entries(configs).forEach(([tenantId, config]) => {
      aisConfigs.set(tenantId, config);
    });
    console.log(`Loaded ${aisConfigs.size} AIS configuration(s) from file`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist yet, that's okay
      console.log('No existing AIS configuration file found, starting fresh');
    } else {
      console.error('Error loading AIS configurations:', error);
    }
  }
}

// Save configurations to file
async function saveConfigs() {
  try {
    const configs = Object.fromEntries(aisConfigs);
    await fs.writeFile(CONFIG_FILE, JSON.stringify(configs, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving AIS configurations:', error);
    throw error;
  }
}

// Initialize on module load
loadConfigs().catch(console.error);

/**
 * Get AIS configuration for a tenant
 */
export function getAisConfig(tenantId) {
  return aisConfigs.get(tenantId);
}

/**
 * Set AIS configuration for a tenant
 */
export async function setAisConfig(tenantId, config) {
  aisConfigs.set(tenantId, config);
  await saveConfigs();
}

/**
 * Delete AIS configuration for a tenant
 */
export async function deleteAisConfig(tenantId) {
  aisConfigs.delete(tenantId);
  await saveConfigs();
}

