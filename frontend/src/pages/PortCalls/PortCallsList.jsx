import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../utils/useI18n';
import { api } from '../../utils/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import styles from './PortCallsList.module.css';

function PortCallsList() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const { data: portCalls, isLoading } = useQuery({
    queryKey: ['portCalls'],
    queryFn: () => api.get('/port-calls'),
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{t('portCalls.title')}</h1>
        <button className={styles.newButton}>+ {t('portCalls.newPortCall')}</button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>{t('common.loading')}</div>
      ) : portCalls?.length > 0 ? (
        <div className={styles.grid}>
          {portCalls.map((portCall) => (
            <Card
              key={portCall.id}
              className={styles.card}
              onClick={() => navigate(`/port-calls/${portCall.id}`)}
            >
              <div className={styles.cardHeader}>
                <div>
                  <h3>{portCall.vessel?.name || 'Unknown Vessel'}</h3>
                  <p className={styles.port}>{portCall.port?.name || portCall.portId}</p>
                </div>
                <Badge status={portCall.status}>
                  {t(`portCalls.status.${portCall.status}`) || portCall.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className={styles.details}>
                <div className={styles.detailRow}>
                  <span className={styles.label}>{t('portCalls.eta')}:</span>
                  <span>{formatDate(portCall.eta)}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>{t('portCalls.etd')}:</span>
                  <span>{formatDate(portCall.etd)}</span>
                </div>
                {portCall.localReferenceNumber && (
                  <div className={styles.detailRow}>
                    <span className={styles.label}>{t('portCalls.ref')}:</span>
                    <span>{portCall.localReferenceNumber}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>{t('dashboard.noPortCalls')}</div>
      )}
    </div>
  );
}

export default PortCallsList;

