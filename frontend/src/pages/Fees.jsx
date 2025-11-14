import { useI18n } from '../utils/useI18n';
import Card from '../components/ui/Card';
import styles from './Fees.module.css';

function Fees() {
  const { t } = useI18n();
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{t('fees.title')}</h1>
        <p>{t('fees.subtitle')}</p>
      </div>
      <Card>
        <p className={styles.comingSoon}>{t('fees.comingSoon')}</p>
      </Card>
    </div>
  );
}

export default Fees;

