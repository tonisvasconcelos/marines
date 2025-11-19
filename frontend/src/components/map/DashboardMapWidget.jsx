import DashboardMapMapLibre from './DashboardMapMapLibre';
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
      </div>
      <div className={styles.mapWidgetContent}>
        <DashboardMapMapLibre
          vessels={vessels}
          geofences={null}
          opsSites={null}
          onVesselClick={onVesselClick}
          showControls={true}
          isDashboardWidget={true}
        />
      </div>
    </div>
  );
}

export default DashboardMapWidget;

