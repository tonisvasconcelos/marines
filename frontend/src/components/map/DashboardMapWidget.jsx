import { useRef } from 'react';
import DashboardMapMapLibre from './DashboardMapMapLibre';
import { FiMaximize2 } from 'react-icons/fi';
import styles from './DashboardMapWidget.module.css';

/**
 * Small map widget for dashboard
 * Shows a compact map with an expand button to go fullscreen
 */
function DashboardMapWidget({ vessels, onVesselClick, onExpand }) {
  return (
    <div className={styles.mapWidget}>
      <div className={styles.mapWidgetHeader}>
        <h3 className={styles.mapWidgetTitle}>Mapa</h3>
        <button
          className={styles.expandButton}
          onClick={onExpand}
          title="Expand to fullscreen"
          aria-label="Expand map to fullscreen"
        >
          <FiMaximize2 />
        </button>
      </div>
      <div className={styles.mapWidgetContent}>
        <DashboardMapMapLibre
          vessels={vessels}
          geofences={null}
          opsSites={null}
          onVesselClick={onVesselClick}
          showControls={true}
        />
      </div>
    </div>
  );
}

export default DashboardMapWidget;

