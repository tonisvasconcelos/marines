import { FiMaximize2 } from 'react-icons/fi';
import styles from './MapExpandButton.module.css';

/**
 * Map Expand Button Widget
 * Floating button on the map to expand to fullscreen
 */
function MapExpandButton({ onExpand }) {
  return (
    <button
      className={styles.expandButton}
      onClick={onExpand}
      title="Expand to fullscreen"
      aria-label="Expand map to fullscreen"
    >
      <FiMaximize2 size={18} />
    </button>
  );
}

export default MapExpandButton;

