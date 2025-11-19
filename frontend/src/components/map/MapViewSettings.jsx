import { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import styles from './MapViewSettings.module.css';

/**
 * Unified MapViewSettings Widget
 * Map mode selector with multi-selection support
 * Can be minimized to save space on the map
 */
function MapViewSettings({ 
  map, 
  selectedLayers = [], 
  onLayersChange
}) {
  const [isMinimized, setIsMinimized] = useState(false);

  // Available map layer options
  const mapLayers = [
    { id: 'standard', label: 'Padrão' },
    { id: 'dark', label: 'Dark' },
    { id: 'nautical', label: 'Carta Náutica' },
  ];

  const handleLayerToggle = (layerId) => {
    if (!onLayersChange) return;
    
    const newSelectedLayers = selectedLayers.includes(layerId)
      ? selectedLayers.filter(id => id !== layerId)
      : [...selectedLayers, layerId];
    
    onLayersChange(newSelectedLayers);
  };

  return (
    <div className={styles.mapViewSettings}>
      {/* Widget Header with Minimize Button */}
      <div className={styles.widgetHeader}>
        <div className={styles.widgetTitle}>MAPA</div>
        <button
          className={styles.minimizeButton}
          onClick={() => setIsMinimized(!isMinimized)}
          title={isMinimized ? "Expand widget" : "Minimize widget"}
          aria-label={isMinimized ? "Expand widget" : "Minimize widget"}
        >
          {isMinimized ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
        </button>
      </div>

      {/* Content - Hidden when minimized */}
      {!isMinimized && (
        <div className={styles.widgetContent}>
          {/* Map Mode Selector Section - Multi-selection */}
          <div className={styles.settingsSection}>
            <div className={styles.mapModeButtons}>
              {mapLayers.map((layer) => {
                const isSelected = selectedLayers.includes(layer.id);
                return (
                  <button
                    key={layer.id}
                    className={`${styles.mapModeButton} ${isSelected ? styles.active : ''}`}
                    onClick={() => handleLayerToggle(layer.id)}
                    title={layer.label}
                  >
                    {layer.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapViewSettings;

