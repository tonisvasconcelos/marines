import { useI18n } from '../utils/useI18n';
import Card from '../components/ui/Card';
import styles from './People.module.css';

function People() {
  const { t } = useI18n();
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{t('people.title')}</h1>
        <p>{t('people.subtitle')}</p>
      </div>
      <Card>
        <p className={styles.comingSoon}>{t('people.comingSoon')}</p>
      </Card>
    </div>
  );
}

export default People;

