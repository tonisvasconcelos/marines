/**
 * OverlayControls Component
 * MyShipTracking-style layer switcher panel
 * Supports Standard, Dark, Satellite, Nautical base maps
 */

import { useState } from 'react';
import { FiMap, FiMoon, FiGlobe, FiAnchor } from 'react-icons/fi';
import styles from './OverlayControls.module.css';

const BASE_LAYERS = [
  { id: 'standard', name: 'Standard', icon: FiMap },
  { id: 'dark', name: 'Dark', icon: FiMoon },
  { id: 'satellite', name: 'Satellite', icon: FiGlobe },
  { id: 'nautical', name: 'Nautical', icon: FiAnchor },
];

const OVERLAYS = [
  { id: 'graticule', name: 'Graticule', enabled: false },
  { id: 'daylight', name: 'Daylight', enabled: false },
  { id: 'openseamap', name: 'OpenSeaMap', enabled: false },
];

export function OverlayControls({ baseLayer, onBaseLayerChange, overlays = {}, onOverlayToggle }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={styles.overlayControls}>
      <button
        className={styles.toggleButton}
        onClick={() => setIsExpanded(!isExpanded)}
        title="Map Layers"
      >
        <FiMap size={18} />
      </button>

      {isExpanded && (
        <div className={styles.panel}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Base Map</div>
            <div className={styles.layerButtons}>
              {BASE_LAYERS.map((layer) => {
                const Icon = layer.icon;
                return (
                  <button
                    key={layer.id}
                    className={`${styles.layerButton} ${baseLayer === layer.id ? styles.active : ''}`}
                    onClick={() => onBaseLayerChange(layer.id)}
                    title={layer.name}
                  >
                    <Icon size={16} />
                    <span>{layer.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Overlays</div>
            <div className={styles.overlayList}>
              {OVERLAYS.map((overlay) => (
                <label key={overlay.id} className={styles.overlayItem}>
                  <input
                    type="checkbox"
                    checked={overlays[overlay.id] || false}
                    onChange={(e) => onOverlayToggle?.(overlay.id, e.target.checked)}
                  />
                  <span>{overlay.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OverlayControls;

