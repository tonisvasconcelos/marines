import { useQuery } from '@tanstack/react-query';
import { api } from '../../utils/api';
import Card from '../../components/ui/Card';
import styles from './Settings.module.css';

function SettingsAis() {
  const { data: config, isLoading } = useQuery({
    queryKey: ['settings', 'ais'],
    queryFn: () => api.get('/settings/ais'),
  });

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>AIS Configuration</h1>
        <p>MyShipTracking is now the default provider. Keys are managed on the backend via environment variables.</p>
      </div>
      <Card>
        <div className={styles.field}>
          <label>Provider</label>
          <div className={styles.readonlyValue}>MyShipTracking</div>
        </div>
        <div className={styles.field}>
          <label>API Key</label>
          <div className={styles.readonlyValue}>
            {config?.apiKeyPresent ? 'Configured (server env MYSHIPTRACKING_API_KEY and MYSHIPTRACKING_SECRET_KEY)' : 'Missing - set MYSHIPTRACKING_API_KEY and MYSHIPTRACKING_SECRET_KEY in backend environment'}
          </div>
        </div>
        <div className={styles.field}>
          <label>API URL</label>
          <div className={styles.readonlyValue}>{config?.apiUrl || 'https://api.myshiptracking.com'}</div>
        </div>
        <div className={styles.field}>
          <label>Supported Identifiers</label>
          <div className={styles.readonlyValue}>
            {config?.supportedIdentifiers?.join(', ') || 'MMSI, IMO'}
          </div>
        </div>
        <p style={{ marginTop: '12px', color: 'var(--gray-600)' }}>
          Note: Tenant-level overrides are disabled. Update server environment variables to change the MyShipTracking configuration.
          <span style={{ display: 'block', marginTop: '8px' }}>
            MyShipTracking supports both MMSI and IMO for vessel tracking. Historical track data is available.
          </span>
        </p>
      </Card>
    </div>
  );
}

export default SettingsAis;

