import { useState } from 'react';
import { useI18n } from '../../utils/useI18n';
import { FiX } from 'react-icons/fi';
import styles from './SaveAreaModal.module.css';

function SaveAreaModal({ points, onSave, onCancel }) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'ANCHORED_ZONE',
    country: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a name for the area');
      return;
    }
    onSave(formData);
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Save Area as Ops. Site</h3>
          <button className={styles.closeButton} onClick={onCancel}>
            <FiX size={20} />
          </button>
        </div>
        
        <div className={styles.content}>
          <p className={styles.info}>
            You've drawn an area with {points.length} points. Complete the form below to save it as an operational site.
          </p>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Anchorage Zone A"
                required
                autoFocus
              />
            </div>
            
            <div className={styles.field}>
              <label>Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., ANCH-A"
              />
            </div>
            
            <div className={styles.field}>
              <label>Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              >
                <option value="ANCHORED_ZONE">{t('opsSites.types.ANCHORED_ZONE')}</option>
                <option value="PORT">{t('opsSites.types.PORT')}</option>
                <option value="TERMINAL">{t('opsSites.types.TERMINAL')}</option>
                <option value="BERTH">{t('opsSites.types.BERTH')}</option>
              </select>
            </div>
            
            <div className={styles.field}>
              <label>Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="BR, US, etc."
                maxLength={2}
              />
            </div>
            
            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={onCancel}>
                {t('common.cancel')}
              </button>
              <button type="submit" className={styles.saveBtn}>
                {t('opsSites.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SaveAreaModal;

