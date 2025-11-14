import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../utils/useI18n';
import { api } from '../utils/api';
import Card from '../components/ui/Card';
import styles from './Agents.module.css';

function Agents() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [showTeams, setShowTeams] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    teamId: '',
    active: true,
  });

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get('/agents'),
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/agents', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['agents']);
      setIsAdding(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/agents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['agents']);
      setEditingId(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['agents']);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: '',
      teamId: '',
      active: true,
    });
  };

  const handleEdit = (agent) => {
    setEditingId(agent.id);
    setIsAdding(false);
    setActiveTab('form');
    setFormData({
      name: agent.name || '',
      email: agent.email || '',
      phone: agent.phone || '',
      role: agent.role || '',
      teamId: agent.teamId || '',
      active: agent.active !== undefined ? agent.active : true,
    });
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setActiveTab('form');
    resetForm();
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      alert(t('agents.nameRequired'));
      return;
    }
    
    const data = { ...formData };
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm(t('agents.deleteConfirm'))) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  const tabs = [
    { id: 'form', labelKey: 'agents.tabs.details' },
    { id: 'teams', labelKey: 'agents.tabs.teams', hidden: !editingId && !isAdding },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>{t('agents.title')}</h1>
          <p>{t('agents.subtitle')}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.teamsButton} onClick={() => setShowTeams(!showTeams)}>
            {t('agents.manageTeams')}
          </button>
          {!isAdding && !editingId && (
            <button className={styles.addButton} onClick={handleAdd}>
              + {t('agents.addNew')}
            </button>
          )}
        </div>
      </div>

      {showTeams && <TeamsManager onClose={() => setShowTeams(false)} />}

      {(isAdding || editingId) && (
        <div className={styles.tabs}>
          {tabs.filter(tab => !tab.hidden).map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      )}

      {(isAdding || editingId) && (
        <div className={styles.tabContent}>
          {activeTab === 'form' && (
            <Card className={styles.formCard}>
              <h2>{editingId ? t('agents.edit') : t('agents.addNew')}</h2>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label>{t('agents.name')} *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label>{t('agents.email')}</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label>{t('agents.phone')}</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label>{t('agents.role')}</label>
                    <input
                      type="text"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder={t('agents.rolePlaceholder')}
                    />
                  </div>
                  <div className={styles.field}>
                    <label>{t('agents.team')}</label>
                    <select
                      value={formData.teamId}
                      onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                    >
                      <option value="">{t('agents.noTeam')}</option>
                      {teams?.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className={styles.checkbox}
                      />
                      <span>{t('agents.active')}</span>
                    </label>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button
                    type="submit"
                    className={styles.saveButton}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {t('agents.save')}
                  </button>
                  <button type="button" className={styles.cancelButton} onClick={handleCancel}>
                    {t('agents.cancel')}
                  </button>
                </div>
              </form>
            </Card>
          )}
          {activeTab === 'teams' && editingId && <AgentTeamsTab agentId={editingId} />}
        </div>
      )}

      {!isAdding && !editingId && (
        <Card>
          {agents?.length > 0 ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('agents.name')}</th>
                    <th>{t('agents.email')}</th>
                    <th>{t('agents.phone')}</th>
                    <th>{t('agents.role')}</th>
                    <th>{t('agents.team')}</th>
                    <th>{t('agents.status')}</th>
                    <th>{t('common.edit')}</th>
                    <th>{t('common.delete')}</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => {
                    const team = teams?.find((t) => t.id === agent.teamId);
                    return (
                      <tr key={agent.id}>
                        <td>{agent.name}</td>
                        <td>{agent.email || '-'}</td>
                        <td>{agent.phone || '-'}</td>
                        <td>{agent.role || '-'}</td>
                        <td>
                          {team ? (
                            <span
                              className={styles.teamBadge}
                              style={{ backgroundColor: team.color + '20', color: team.color }}
                            >
                              {team.name}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              agent.active ? styles.active : styles.inactive
                            }`}
                          >
                            {agent.active ? t('agents.active') : t('agents.inactive')}
                          </span>
                        </td>
                        <td>
                          <button
                            className={styles.editButton}
                            onClick={() => handleEdit(agent)}
                            disabled={editingId !== null || isAdding}
                          >
                            {t('common.edit')}
                          </button>
                        </td>
                        <td>
                          <button
                            className={styles.deleteButton}
                            onClick={() => handleDelete(agent.id)}
                            disabled={deleteMutation.isPending}
                          >
                            {t('common.delete')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.empty}>{t('agents.noAgents')}</div>
          )}
        </Card>
      )}
    </div>
  );
}

// Teams Manager Component
function TeamsManager({ onClose }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/teams', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/teams/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
      setEditingTeamId(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
    });
  };

  const handleEdit = (team) => {
    setEditingTeamId(team.id);
    setFormData({
      name: team.name || '',
      description: team.description || '',
      color: team.color || '#3B82F6',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert(t('teams.nameRequired'));
      return;
    }

    if (editingTeamId) {
      updateMutation.mutate({ id: editingTeamId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  return (
    <Card className={styles.teamsManager}>
      <div className={styles.teamsManagerHeader}>
        <h2>{t('teams.title')}</h2>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label>{t('teams.name')} *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className={styles.field}>
            <label>{t('teams.description')}</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label>{t('teams.color')}</label>
            <div className={styles.colorInput}>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className={styles.colorPicker}
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className={styles.colorText}
              />
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingTeamId ? t('teams.update') : t('teams.create')}
          </button>
          {editingTeamId && (
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => {
                setEditingTeamId(null);
                resetForm();
              }}
            >
              {t('common.cancel')}
            </button>
          )}
        </div>
      </form>

      <div className={styles.teamsList}>
        <h3>{t('teams.existingTeams')}</h3>
        {teams && teams.length > 0 ? (
          <div className={styles.teamsGrid}>
            {teams.map((team) => (
              <div key={team.id} className={styles.teamCard}>
                <div
                  className={styles.teamColor}
                  style={{ backgroundColor: team.color }}
                />
                <div className={styles.teamInfo}>
                  <h4>{team.name}</h4>
                  {team.description && <p>{team.description}</p>}
                </div>
                <div className={styles.teamActions}>
                  <button
                    className={styles.editButton}
                    onClick={() => handleEdit(team)}
                    disabled={editingTeamId === team.id}
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => {
                      if (window.confirm(t('teams.deleteConfirm'))) {
                        deleteMutation.mutate(team.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>{t('teams.noTeams')}</div>
        )}
      </div>
    </Card>
  );
}

// Agent Teams Tab (placeholder for future use)
function AgentTeamsTab({ agentId }) {
  const { t } = useI18n();
  return (
    <Card>
      <h2>{t('agents.tabs.teams')}</h2>
      <p>{t('agents.teamInfo')}</p>
    </Card>
  );
}

export default Agents;

