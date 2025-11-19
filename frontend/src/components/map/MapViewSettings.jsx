import { FiCrosshair, FiZoomIn } from 'react-icons/fi';
import styles from './MapViewSettings.module.css';

/**
 * Unified MapViewSettings Widget
 * Combines map mode selector and map control buttons in a single widget
 */
function MapViewSettings({ 
  map, 
  vessels, 
  baseLayer, 
  onBaseLayerChange, 
  onZoomToFleet 
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleZoomToFleet = () => {
    if (!map || !vessels || vessels.length === 0) return;
    
    const bounds = [];
    vessels.forEach((vessel) => {
      if (vessel.position) {
        const rawLat = vessel.position.lat ?? vessel.position.latitude ?? null;
        const rawLon = vessel.position.lon ?? vessel.position.longitude ?? null;
        
        if (rawLat && rawLon) {
          const lat = typeof rawLat === 'string' ? parseFloat(rawLat) : Number(rawLat);
          const lon = typeof rawLon === 'string' ? parseFloat(rawLon) : Number(rawLon);
          
          if (isFinite(lat) && isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            bounds.push([lon, lat]); // MapLibre uses [lon, lat]
          }
        }
      }
    });
    
    if (bounds.length > 0) {
      // Calculate bounding box
      const lons = bounds.map(b => b[0]);
      const lats = bounds.map(b => b[1]);
      const bbox = [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ];
      
      map.fitBounds(bbox, { padding: 50 });
      if (onZoomToFleet) onZoomToFleet();
    }
  };

  const handleAutoCenter = () => {
    if (!map) return;
    // Center on default operational area (Rio de Janeiro)
    map.easeTo({
      center: [-43.1729, -22.9068], // [lon, lat]
      zoom: 8,
    });
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className={styles.mapViewSettings}>
      {/* Map Mode Selector Section */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeader}>MAPA</div>
        <div className={styles.mapModeButtons}>
          <button
            className={`${styles.mapModeButton} ${baseLayer === 'standard' ? styles.active : ''}`}
            onClick={() => onBaseLayerChange('standard')}
          >
            Padrão
          </button>
          <button
            className={`${styles.mapModeButton} ${baseLayer === 'nautical' ? styles.active : ''}`}
            onClick={() => onBaseLayerChange('nautical')}
          >
            Carta Náutica
          </button>
        </div>
      </div>

      {/* Map Controls Section */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeader}>CONTROLES</div>
        <div className={styles.controlButtons}>
          <button
            className={styles.controlButton}
            onClick={handleZoomToFleet}
            title="Zoom to Fleet"
          >
            <FiZoomIn size={16} />
            <span>Zoom to Fleet</span>
          </button>
          
          <button
            className={styles.controlButton}
            onClick={handleAutoCenter}
            title="Auto Center"
          >
            <FiCrosshair size={16} />
            <span>Center</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MapViewSettings;

