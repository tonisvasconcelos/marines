import { useI18n } from '../utils/useI18n';
import Card from '../components/ui/Card';
import styles from './Security.module.css';

function Security() {
  const { t } = useI18n();
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{t('security.title')}</h1>
        <p>{t('security.subtitle')}</p>
      </div>
      <Card>
        <p className={styles.comingSoon}>{t('security.comingSoon')}</p>
      </Card>
    </div>
  );
}

export default Security;

