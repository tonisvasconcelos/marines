import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../utils/api';
import Card from '../../components/ui/Card';
import styles from './Settings.module.css';

// AIS Configuration Component
function SettingsAis() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    provider: 'myshiptracking',
    apiKey: '',
    secretKey: '',
    pollFrequencyMinutes: 15,
    trackHistoryHours: 72,
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['settings', 'ais'],
    queryFn: () => api.get('/settings/ais'),
  });

  // Update form data when config loads
  useEffect(() => {
    if (config) {
      setFormData({
        provider: config.provider || 'myshiptracking',
        apiKey: config.apiKey || '',
        // Don't populate secret key if it's masked
        secretKey: config.secretKey && config.secretKey !== '***' ? config.secretKey : '',
        pollFrequencyMinutes: config.pollFrequencyMinutes || 15,
        trackHistoryHours: config.trackHistoryHours || 72,
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/settings/ais', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings', 'ais']);
      alert('AIS configuration saved successfully');
    },
    onError: (error) => {
      alert('Failed to save configuration: ' + error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>AIS Configuration</h1>
        <p>Configure AIS data provider and polling settings</p>
      </div>
      <Card>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>AIS Provider</label>
            <select
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
            >
              <option value="mock">Mock (Development)</option>
              <option value="myshiptracking">MyShipTracking</option>
              <option value="marinetraffic">MarineTraffic</option>
              <option value="aisapi">AIS API</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>API Key</label>
            <input
              type="password"
              placeholder="Enter API key"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label>Secret Key</label>
            <input
              type="password"
              placeholder={config?.secretKey === '***' ? 'Secret key is set (enter new value to change)' : 'Enter secret key'}
              value={formData.secretKey}
              onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
            />
            {config?.secretKey === '***' && (
              <small style={{ color: 'var(--gray-600)', fontSize: '12px', marginTop: '4px' }}>
                Secret key is already configured. Leave empty to keep current value, or enter a new value to change it.
              </small>
            )}
          </div>
          <div className={styles.field}>
            <label>Poll Frequency (minutes)</label>
            <input
              type="number"
              value={formData.pollFrequencyMinutes}
              onChange={(e) => setFormData({ ...formData, pollFrequencyMinutes: parseInt(e.target.value) || 15 })}
              min="1"
              max="60"
            />
          </div>
          <div className={styles.field}>
            <label>Track History (hours)</label>
            <input
              type="number"
              value={formData.trackHistoryHours}
              onChange={(e) => setFormData({ ...formData, trackHistoryHours: parseInt(e.target.value) || 72 })}
              min="1"
              max="168"
            />
          </div>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>
      </Card>
    </div>
  );
}

export default SettingsAis;

