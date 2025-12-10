import WebSocket from 'ws';

const WS_URL = process.env.AISSTREAM_WS_URL || 'wss://stream.aisstream.io/v0/stream';
const API_KEY = process.env.AISSTREAM_API_KEY;

function requireApiKey() {
  if (!API_KEY) {
    throw new Error('AISSTREAM_API_KEY is not set');
  }
}

function normalizePosition(msg) {
  const meta = msg?.MetaData || msg?.metadata || {};
  const position = msg?.PositionReport || msg?.ClassAPositionReport || msg?.Message || {};

  const lat =
    meta.Latitude ??
    meta.latitude ??
    position.Latitude ??
    position.latitude;
  const lon =
    meta.Longitude ??
    meta.longitude ??
    position.Longitude ??
    position.longitude;

  if (lat === undefined || lon === undefined) return null;

  const timestamp =
    meta.Timestamp ??
    meta.timestamp ??
    position.Timestamp ??
    position.timestamp ??
    new Date().toISOString();

  return {
    mmsi: meta.MMSI || meta.mmsi || position.MMSI || position.mmsi || msg?.MMSI || msg?.mmsi,
    imo: meta.IMO || meta.imo || position.IMO || position.imo,
    name: meta.ShipName || meta.shipName || position.ShipName || position.shipName,
    callSign: meta.CallSign || position.CallSign,
    lat: Number(lat),
    lon: Number(lon),
    cog: Number(meta.COG ?? position.COG ?? position.Cog ?? position.cog) || undefined,
    sog: Number(meta.SOG ?? position.SOG ?? position.Speed ?? position.sog) || undefined,
    heading: Number(meta.Heading ?? position.Heading ?? position.TrueHeading) || undefined,
    navStatus: meta.NavigationalStatus || position.NavigationalStatus || position.NavStatus,
    timestamp: typeof timestamp === 'string' ? timestamp : new Date(timestamp).toISOString(),
  };
}

async function streamPositions({ boundingBoxes, shipMMSI, timeoutMs = 2000, maxMessages = 200 }) {
  requireApiKey();

  const payload = {
    APIKey: API_KEY,
    BoundingBoxes: boundingBoxes,
    FilterMessageTypes: ['PositionReport', 'ClassAPositionReport', 'StandardClassBCSPositionReport'],
  };

  if (shipMMSI && shipMMSI.length > 0) {
    payload.FiltersShipMMSI = shipMMSI;
  }

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const results = new Map();
    let settled = false;

    const finalize = () => {
      if (settled) return;
      settled = true;
      try {
        ws.terminate();
      } catch (_) {
        // ignore
      }
      resolve(Array.from(results.values()));
    };

    const timer = setTimeout(finalize, timeoutMs);

    ws.on('open', () => {
      ws.send(JSON.stringify(payload));
    });

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        const normalized = normalizePosition(parsed);
        if (normalized?.mmsi) {
          results.set(normalized.mmsi, normalized);
          if (results.size >= maxMessages) {
            clearTimeout(timer);
            finalize();
          }
        }
      } catch (err) {
        // swallow parse errors for robustness
        console.warn('AISStream parse error:', err.message);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    ws.on('close', () => {
      clearTimeout(timer);
      finalize();
    });
  });
}

export async function fetchVesselsInZone(bounds, { timeoutMs = 2000, max = 150 } = {}) {
  const boundingBoxes = [
    [
      [Number(bounds.minlat), Number(bounds.minlon)],
      [Number(bounds.maxlat), Number(bounds.maxlon)],
    ],
  ];
  return streamPositions({ boundingBoxes, timeoutMs, maxMessages: max });
}

export async function fetchLatestPositionByMmsi(mmsi, { timeoutMs = 5000 } = {}) {
  // Check API key before attempting connection
  if (!API_KEY) {
    console.error('[AISStream] AISSTREAM_API_KEY is not set - cannot fetch position for MMSI:', mmsi);
    throw new Error('AISSTREAM_API_KEY is not configured');
  }
  
  console.log('[AISStream] Fetching position for MMSI:', mmsi, {
    apiKeyPresent: !!API_KEY,
    apiKeyLength: API_KEY?.length || 0,
    timeoutMs,
  });
  
  try {
    const boundingBoxes = [[[-90, -180], [90, 180]]];
    const results = await streamPositions({ boundingBoxes, shipMMSI: [mmsi], timeoutMs, maxMessages: 5 });
    const position = results.find((r) => r.mmsi === mmsi) || null;
    
    if (position) {
      console.log('[AISStream] Successfully fetched position for MMSI:', mmsi, {
        lat: position.lat,
        lon: position.lon,
        timestamp: position.timestamp,
      });
    } else {
      console.warn('[AISStream] No position data found for MMSI:', mmsi, {
        resultsCount: results.length,
        receivedMmsis: results.map(r => r.mmsi),
      });
    }
    
    return position;
  } catch (error) {
    console.error('[AISStream] Error fetching position for MMSI:', mmsi, {
      error: error.message,
      errorType: error.constructor.name,
      apiKeyPresent: !!API_KEY,
    });
    throw error;
  }
}

export async function fetchTrackByMmsi(mmsi, { timeoutMs = 2000, max = 100 } = {}) {
  // AISStream is a live feed; we approximate a short history by collecting a burst
  const boundingBoxes = [[[-90, -180], [90, 180]]];
  const results = await streamPositions({ boundingBoxes, shipMMSI: [mmsi], timeoutMs, maxMessages: max });
  return results
    .filter((r) => r.mmsi === mmsi)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

