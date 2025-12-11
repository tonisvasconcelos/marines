/**
 * Input validation middleware for MyShipTracking API parameters
 * Validates MMSI, IMO, port_id, and zone bounds before making API calls
 */

/**
 * Validate MMSI format
 * MMSI must be exactly 9 digits
 * @param {string|number} mmsi - MMSI to validate
 * @throws {Error} If MMSI is invalid
 */
export function validateMmsi(mmsi) {
  if (!mmsi) {
    throw new Error('MMSI is required');
  }
  
  const mmsiStr = String(mmsi).trim();
  
  if (!/^\d{9}$/.test(mmsiStr)) {
    throw new Error('MMSI must be exactly 9 digits');
  }
  
  return mmsiStr;
}

/**
 * Validate IMO format
 * IMO must be exactly 7 digits (with or without 'IMO' prefix)
 * @param {string|number} imo - IMO to validate
 * @throws {Error} If IMO is invalid
 */
export function validateImo(imo) {
  if (!imo) {
    throw new Error('IMO is required');
  }
  
  // Remove 'IMO' prefix if present
  const cleanImo = String(imo).replace(/^IMO/i, '').trim();
  
  if (!/^\d{7}$/.test(cleanImo)) {
    throw new Error('IMO must be exactly 7 digits');
  }
  
  return cleanImo;
}

/**
 * Validate zone bounds
 * @param {Object} bounds - Zone bounds object
 * @param {number} bounds.minlat - Minimum latitude
 * @param {number} bounds.maxlat - Maximum latitude
 * @param {number} bounds.minlon - Minimum longitude
 * @param {number} bounds.maxlon - Maximum longitude
 * @throws {Error} If bounds are invalid
 */
export function validateZoneBounds(bounds) {
  const { minlat, maxlat, minlon, maxlon } = bounds;
  
  // Check all parameters are present
  if (minlat === undefined || maxlat === undefined || minlon === undefined || maxlon === undefined) {
    throw new Error('Zone bounds must include minlat, maxlat, minlon, and maxlon');
  }
  
  // Convert to numbers
  const minLat = Number(minlat);
  const maxLat = Number(maxlat);
  const minLon = Number(minlon);
  const maxLon = Number(maxlon);
  
  // Validate latitude range (-90 to 90)
  if (isNaN(minLat) || minLat < -90 || minLat > 90) {
    throw new Error('minlat must be a number between -90 and 90');
  }
  
  if (isNaN(maxLat) || maxLat < -90 || maxLat > 90) {
    throw new Error('maxlat must be a number between -90 and 90');
  }
  
  if (minLat >= maxLat) {
    throw new Error('minlat must be less than maxlat');
  }
  
  // Validate longitude range (-180 to 180)
  if (isNaN(minLon) || minLon < -180 || minLon > 180) {
    throw new Error('minlon must be a number between -180 and 180');
  }
  
  if (isNaN(maxLon) || maxLon < -180 || maxLon > 180) {
    throw new Error('maxlon must be a number between -180 and 180');
  }
  
  if (minLon >= maxLon) {
    throw new Error('minlon must be less than maxlon');
  }
  
  // Validate zone size (prevent extremely large zones)
  const latRange = maxLat - minLat;
  const lonRange = maxLon - minLon;
  
  if (latRange > 90) {
    throw new Error('Latitude range cannot exceed 90 degrees');
  }
  
  if (lonRange > 180) {
    throw new Error('Longitude range cannot exceed 180 degrees');
  }
  
  return {
    minlat: minLat,
    maxlat: maxLat,
    minlon: minLon,
    maxlon: maxLon,
  };
}

/**
 * Validate port_id format
 * Port ID should be a non-empty string
 * @param {string} portId - Port ID to validate
 * @throws {Error} If port_id is invalid
 */
export function validatePortId(portId) {
  if (!portId) {
    throw new Error('port_id is required');
  }
  
  const portIdStr = String(portId).trim();
  
  if (portIdStr.length === 0) {
    throw new Error('port_id cannot be empty');
  }
  
  if (portIdStr.length > 255) {
    throw new Error('port_id cannot exceed 255 characters');
  }
  
  return portIdStr;
}

/**
 * Express middleware to validate MMSI query parameter
 */
export function validateMmsiParam(req, res, next) {
  try {
    if (req.query.mmsi) {
      req.query.mmsi = validateMmsi(req.query.mmsi);
    }
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Validation error',
      message: error.message,
    });
  }
}

/**
 * Express middleware to validate IMO query parameter
 */
export function validateImoParam(req, res, next) {
  try {
    if (req.query.imo) {
      req.query.imo = validateImo(req.query.imo);
    }
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Validation error',
      message: error.message,
    });
  }
}

/**
 * Express middleware to validate zone bounds query parameters
 */
export function validateZoneBoundsParam(req, res, next) {
  try {
    const { minlat, maxlat, minlon, maxlon } = req.query;
    
    if (minlat || maxlat || minlon || maxlon) {
      // If any zone parameter is provided, all must be provided
      const validatedBounds = validateZoneBounds({
        minlat,
        maxlat,
        minlon,
        maxlon,
      });
      
      // Replace query params with validated values
      req.query.minlat = validatedBounds.minlat;
      req.query.maxlat = validatedBounds.maxlat;
      req.query.minlon = validatedBounds.minlon;
      req.query.maxlon = validatedBounds.maxlon;
    }
    
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Validation error',
      message: error.message,
    });
  }
}

/**
 * Express middleware to validate that at least one of MMSI or IMO is provided
 */
export function validateVesselIdentifier(req, res, next) {
  try {
    const { mmsi, imo } = req.query;
    
    if (!mmsi && !imo) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Either mmsi or imo is required',
      });
    }
    
    // Validate whichever is provided
    if (mmsi) {
      req.query.mmsi = validateMmsi(mmsi);
    }
    
    if (imo) {
      req.query.imo = validateImo(imo);
    }
    
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Validation error',
      message: error.message,
    });
  }
}

