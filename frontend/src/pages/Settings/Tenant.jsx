import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../utils/api';
import { useI18n } from '../../utils/useI18n';
import { useAuth } from '../../modules/auth/AuthContext';
import Card from '../../components/ui/Card';
import styles from './Settings.module.css';

function SettingsTenant() {
  const { t, changeLocale } = useI18n();
  const { tenant: currentTenant, setTenant } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    defaultCountryCode: 'BR',
    defaultLocale: 'pt-BR',
  });

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['settings', 'tenant'],
    queryFn: () => api.get('/settings/tenant'),
    onSuccess: (data) => {
      setFormData({
        name: data.name || '',
        defaultCountryCode: data.defaultCountryCode || 'BR',
        defaultLocale: data.defaultLocale || 'pt-BR',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.put('/settings/tenant', data),
    onSuccess: (data) => {
      // Update locale immediately
      if (data.defaultLocale) {
        changeLocale(data.defaultLocale);
      }
      
      // Update tenant in auth context
      const updatedTenant = { ...currentTenant, ...data };
      setTenant(updatedTenant);
      localStorage.setItem('auth_tenant', JSON.stringify(updatedTenant));
      
      queryClient.invalidateQueries(['settings', 'tenant']);
      // Show success message
      const successMsg = t('common.save') === 'Save Changes' ? 'Settings saved!' : 'Configurações salvas!';
      alert(successMsg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleLocaleChange = (e) => {
    const newLocale = e.target.value;
    setFormData({ ...formData, defaultLocale: newLocale });
    // Immediately change locale for preview
    changeLocale(newLocale);
  };

  if (isLoading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{t('settings.tenant.title')}</h1>
        <p>{t('settings.tenant.subtitle')}</p>
      </div>
      <Card>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>{t('settings.tenant.organizationName')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label>{t('settings.tenant.defaultCountry')}</label>
            <select
              value={formData.defaultCountryCode}
              onChange={(e) => setFormData({ ...formData, defaultCountryCode: e.target.value })}
            >
              <option value="BR">Brazil</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>{t('settings.tenant.defaultLocale')}</label>
            <select
              value={formData.defaultLocale}
              onChange={handleLocaleChange}
            >
              <option value="pt-BR">Portuguese (Brazil)</option>
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
            </select>
          </div>
          <button type="submit" className={styles.saveButton} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? t('common.loading') : t('settings.tenant.saveChanges')}
          </button>
        </form>
      </Card>
    </div>
  );
}

export default SettingsTenant;

