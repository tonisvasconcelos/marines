import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../utils/useI18n';
import { api } from '../utils/api';
import Card from '../components/ui/Card';
import styles from './OpsSites.module.css';

function OpsSites() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [viewingPortCallsId, setViewingPortCallsId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'PORT',
    country: '',
    latitude: '',
    longitude: '',
    parentCode: '',
  });

  const { data: sites, isLoading } = useQuery({
    queryKey: ['opsSites'],
    queryFn: () => api.get('/ops-sites'),
  });

  const { data: portCalls, isLoading: portCallsLoading } = useQuery({
    queryKey: ['opsSite', viewingPortCallsId, 'portCalls'],
    queryFn: () => api.get(`/ops-sites/${viewingPortCallsId}/portcalls?limit=50&days=30`),
    enabled: !!viewingPortCallsId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/ops-sites', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['opsSites']);
      setIsAdding(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/ops-sites/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['opsSites']);
      setEditingId(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/ops-sites/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['opsSites']);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: 'PORT',
      country: '',
      latitude: '',
      longitude: '',
      parentCode: '',
    });
  };

  const handleEdit = (site) => {
    setEditingId(site.id);
    setIsAdding(false);
    setFormData({
      name: site.name || '',
      code: site.code || '',
      type: site.type || 'PORT',
      country: site.country || '',
      latitude: site.latitude != null ? site.latitude.toFixed(6) : '',
      longitude: site.longitude != null ? site.longitude.toFixed(6) : '',
      parentCode: site.parentCode || '',
    });
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    resetForm();
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
    };

    // Ensure coordinates have 6 decimal places precision
    if (data.latitude != null && !isNaN(data.latitude)) {
      data.latitude = parseFloat(data.latitude.toFixed(6));
    }
    if (data.longitude != null && !isNaN(data.longitude)) {
      data.longitude = parseFloat(data.longitude.toFixed(6));
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm(t('opsSites.delete') + '?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>{t('opsSites.title')}</h1>
          <p>{t('opsSites.subtitle')}</p>
        </div>
        <button className={styles.addButton} onClick={handleAdd}>
          + {t('opsSites.addNew')}
        </button>
      </div>

      {(isAdding || editingId) && (
        <Card className={styles.formCard}>
          <h2>{editingId ? t('opsSites.edit') : t('opsSites.addNew')}</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>{t('opsSites.name')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className={styles.field}>
                <label>{t('opsSites.code')}</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label>{t('opsSites.type')} *</label>
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
                <label>{t('opsSites.country')}</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="BR, US, etc."
                />
              </div>
              <div className={styles.field}>
                <label>{t('opsSites.latitude')}</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty or valid decimal number
                    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                      setFormData({ ...formData, latitude: value });
                    }
                  }}
                  onBlur={(e) => {
                    // Format to 6 decimal places on blur if value exists
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      setFormData({ ...formData, latitude: value.toFixed(6) });
                    }
                  }}
                  placeholder="-22.906800"
                />
                <small className={styles.helpText}>{t('opsSites.coordinateHelp')}</small>
              </div>
              <div className={styles.field}>
                <label>{t('opsSites.longitude')}</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty or valid decimal number
                    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                      setFormData({ ...formData, longitude: value });
                    }
                  }}
                  onBlur={(e) => {
                    // Format to 6 decimal places on blur if value exists
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      setFormData({ ...formData, longitude: value.toFixed(6) });
                    }
                  }}
                  placeholder="-43.172900"
                />
                <small className={styles.helpText}>{t('opsSites.coordinateHelp')}</small>
              </div>
              <div className={styles.field}>
                <label>{t('opsSites.parent')}</label>
                <select
                  value={formData.parentCode}
                  onChange={(e) => setFormData({ ...formData, parentCode: e.target.value })}
                >
                  <option value="">{t('opsSites.noParent')}</option>
                  {sites
                    ?.filter((s) => s.id !== editingId && s.code) // Exclude current site and sites without code
                    .map((site) => (
                      <option key={site.id} value={site.code}>
                        {site.code} - {site.name}
                      </option>
                    ))}
                </select>
                <small className={styles.helpText}>{t('opsSites.parentHelp')}</small>
              </div>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.saveButton} disabled={createMutation.isPending || updateMutation.isPending}>
                {t('opsSites.save')}
              </button>
              <button type="button" className={styles.cancelButton} onClick={handleCancel}>
                {t('opsSites.cancel')}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {sites?.length > 0 ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('opsSites.name')}</th>
                  <th>{t('opsSites.code')}</th>
                  <th>{t('opsSites.type')}</th>
                  <th>{t('opsSites.country')}</th>
                  <th>{t('opsSites.parent')}</th>
                  <th>{t('opsSites.latitude')}</th>
                  <th>{t('opsSites.longitude')}</th>
                  <th>{t('common.edit')}</th>
                  <th>{t('common.delete')}</th>
                  <th>Port Calls</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id}>
                    <td>{site.name}</td>
                    <td>{site.code || '-'}</td>
                    <td>{t(`opsSites.types.${site.type}`) || site.type}</td>
                    <td>{site.country || '-'}</td>
                    <td>{site.parentCode || '-'}</td>
                    <td>{site.latitude ? site.latitude.toFixed(6) : '-'}</td>
                    <td>{site.longitude ? site.longitude.toFixed(6) : '-'}</td>
                    <td>
                      <button
                        className={styles.editButton}
                        onClick={() => handleEdit(site)}
                        disabled={editingId !== null || isAdding}
                      >
                        {t('common.edit')}
                      </button>
                    </td>
                    <td>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(site.id)}
                        disabled={deleteMutation.isPending}
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                    <td>
                      <button
                        className={styles.viewPortCallsButton}
                        onClick={() => navigate(`/ops-sites/${site.id}/port-calls`)}
                        disabled={!site.latitude || !site.longitude}
                      >
                        View Port Calls
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.empty}>{t('opsSites.noSites')}</div>
        )}
      </Card>

      {viewingPortCallsId && (
        <Card className={styles.portCallsCard}>
          <div className={styles.portCallsHeader}>
            <h2>
              Port Calls for {sites?.find((s) => s.id === viewingPortCallsId)?.name || 'Ops Site'}
            </h2>
            <button
              className={styles.closeButton}
              onClick={() => setViewingPortCallsId(null)}
            >
              ×
            </button>
          </div>
          {portCallsLoading ? (
            <div className={styles.loading}>Loading port calls...</div>
          ) : portCalls && portCalls.length > 0 ? (
            <div className={styles.portCallsList}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Vessel</th>
                    <th>Port</th>
                    <th>Arrival</th>
                    <th>Departure</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {portCalls.map((pc, idx) => (
                    <tr key={idx}>
                      <td>{pc.vessel_name || pc.mmsi || '-'}</td>
                      <td>{pc.port_name || pc.port_id || '-'}</td>
                      <td>
                        {pc.arrival
                          ? new Date(pc.arrival).toLocaleString()
                          : pc.eta
                          ? new Date(pc.eta).toLocaleString()
                          : '-'}
                      </td>
                      <td>
                        {pc.departure
                          ? new Date(pc.departure).toLocaleString()
                          : pc.etd
                          ? new Date(pc.etd).toLocaleString()
                          : '-'}
                      </td>
                      <td>{pc.status || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.empty}>
              No port calls found for this operational area. Make sure AIS settings are configured.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default OpsSites;

