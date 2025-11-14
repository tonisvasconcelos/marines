import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import Card from '../../components/ui/Card';
import VesselForm from '../../components/vessels/VesselForm';
import styles from './VesselsList.module.css';

function VesselsList() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  const { data: vessels, isLoading } = useQuery({
    queryKey: ['vessels'],
    queryFn: () => api.get('/vessels'),
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Vessels</h1>
        <button className={styles.newButton} onClick={() => setShowForm(true)}>
          + New Vessel
        </button>
      </div>

      {showForm && <VesselForm onClose={() => setShowForm(false)} />}

      {isLoading ? (
        <div className={styles.loading}>Loading...</div>
      ) : vessels?.length > 0 ? (
        <div className={styles.grid}>
          {vessels.map((vessel) => (
            <Card
              key={vessel.id}
              className={styles.card}
              onClick={() => navigate(`/vessels/${vessel.id}`)}
            >
              <div className={styles.cardHeader}>
                <h3>{vessel.name}</h3>
                <span className={styles.flag}>{vessel.flag}</span>
              </div>
              <div className={styles.details}>
                <div className={styles.detailRow}>
                  <span className={styles.label}>IMO:</span>
                  <span>{vessel.imo}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>MMSI:</span>
                  <span>{vessel.mmsi}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Call Sign:</span>
                  <span>{vessel.callSign}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>No vessels found</div>
      )}
    </div>
  );
}

export default VesselsList;

