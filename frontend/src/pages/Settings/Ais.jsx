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
        <p>AISStream is now the default provider. Keys are managed on the backend via environment variables.</p>
      </div>
      <Card>
        <div className={styles.field}>
          <label>Provider</label>
          <div className={styles.readonlyValue}>AISStream</div>
        </div>
        <div className={styles.field}>
          <label>API Key</label>
          <div className={styles.readonlyValue}>
            {config?.apiKeyPresent ? 'Configured (server env AISSTREAM_API_KEY)' : 'Missing - set AISSTREAM_API_KEY in backend environment'}
          </div>
        </div>
        <div className={styles.field}>
          <label>WebSocket URL</label>
          <div className={styles.readonlyValue}>{config?.wsUrl || 'wss://stream.aisstream.io/v0/stream'}</div>
        </div>
        <div className={styles.field}>
          <label>Supported Identifiers</label>
          <div className={styles.readonlyValue}>
            {config?.supportedIdentifiers?.join(', ') || 'MMSI'}
            {config?.supportedIdentifiers?.includes('MMSI') && !config?.supportedIdentifiers?.includes('IMO') && (
              <span style={{ marginLeft: '8px', color: 'var(--gray-600)', fontSize: '12px' }}>
                (IMO not supported by AISStream)
              </span>
            )}
          </div>
        </div>
        <p style={{ marginTop: '12px', color: 'var(--gray-600)' }}>
          Note: Tenant-level overrides are disabled. Update server environment variables to change the AISStream configuration.
          {config?.supportedIdentifiers?.includes('MMSI') && !config?.supportedIdentifiers?.includes('IMO') && (
            <span style={{ display: 'block', marginTop: '8px' }}>
              AISStream only supports MMSI for vessel tracking. Vessels without MMSI cannot be tracked via AIS.
            </span>
          )}
        </p>
      </Card>
    </div>
  );
}

export default SettingsAis;

