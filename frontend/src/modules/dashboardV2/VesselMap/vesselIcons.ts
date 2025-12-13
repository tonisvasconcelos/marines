/**
 * Vessel Icons
 * Generates ship SVG icons for MapLibre markers
 * Uses SDF (Signed Distance Field) format for data-driven colors
 */

/**
 * Get vessel status color
 */
export function getVesselStatusColor(
  status: 'AT_SEA' | 'IN_PORT' | 'INBOUND' | 'ANCHORED'
): string {
  switch (status) {
    case 'AT_SEA':
      return '#3b82f6'; // Blue
    case 'IN_PORT':
      return '#10b981'; // Green
    case 'INBOUND':
      return '#f59e0b'; // Amber
    case 'ANCHORED':
      return '#8b5cf6'; // Purple
    default:
      return '#64748b'; // Grey fallback
  }
}

/**
 * Create ship icon as SVG
 * Returns SVG string that can be converted to image for MapLibre
 */
export function createShipIconSVG(size: number = 32): string {
  const padding = 2;
  const centerX = (size + padding * 2) / 2;
  const centerY = (size + padding * 2) / 2;

  // Ship shape: triangle pointing up (bow at top)
  const shipPath = `
    M ${centerX} ${centerY - size * 0.4}
    L ${centerX + size * 0.3} ${centerY + size * 0.3}
    L ${centerX - size * 0.3} ${centerY + size * 0.3}
    Z
  `;

  // Center dot
  const centerDot = `
    <circle cx="${centerX}" cy="${centerY - size * 0.1}" r="${size * 0.08}" fill="#000000" />
  `;

  return `
    <svg width="${size + padding * 2}" height="${size + padding * 2}" 
         viewBox="0 0 ${size + padding * 2} ${size + padding * 2}" 
         xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.3"/>
        </filter>
      </defs>
      <path d="${shipPath}" 
            fill="#ffffff" 
            stroke="#000000" 
            stroke-width="1.5" 
            opacity="0.95" 
            filter="url(#shadow)"/>
      ${centerDot}
    </svg>
  `;
}

/**
 * Convert SVG string to ImageData for MapLibre
 */
export function svgToImageData(svgString: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(imageData);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG image'));
    };

    img.src = url;
  });
}

/**
 * Create ship icon and add to MapLibre map
 * Uses SDF format for data-driven coloring
 */
import maplibregl from 'maplibre-gl';

export async function addShipIconToMap(
  map: maplibregl.Map,
  iconId: string = 'vessel-icon-sdf'
): Promise<void> {
  if (map.hasImage(iconId)) {
    return; // Icon already exists
  }

  const size = 32;
  const padding = 2;
  const canvas = document.createElement('canvas');
  canvas.width = size + padding * 2;
  canvas.height = size + padding * 2;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Draw ship shape (white for SDF - will be colored via icon-color)
  const centerX = (size + padding * 2) / 2;
  const centerY = (size + padding * 2) / 2;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;

  // Draw ship triangle (pointing up = heading 0°)
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - size * 0.4); // Top point (bow)
  ctx.lineTo(centerX + size * 0.3, centerY + size * 0.3); // Bottom right (stern)
  ctx.lineTo(centerX - size * 0.3, centerY + size * 0.3); // Bottom left (stern)
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Add small circle at center
  ctx.beginPath();
  ctx.arc(centerX, centerY - size * 0.1, size * 0.08, 0, 2 * Math.PI);
  ctx.fillStyle = '#000000';
  ctx.fill();

  // Convert canvas to image
  const img = new Image();
  img.onload = () => {
    try {
      map.addImage(iconId, img, { sdf: true });
    } catch (error) {
      console.error('Error adding ship icon to map:', error);
    }
  };
  img.src = canvas.toDataURL();
}
