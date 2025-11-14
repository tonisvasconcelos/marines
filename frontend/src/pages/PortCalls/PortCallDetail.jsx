import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '../../utils/useI18n';
import { api } from '../../utils/api';
import Card from '../../components/ui/Card';
import KpiCard from '../../components/ui/KpiCard';
import Badge from '../../components/ui/Badge';
import MapView from '../../components/ais/MapView';
import styles from './PortCallDetail.module.css';

function PortCallDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', labelKey: 'tabs.overview' },
    { id: 'cargo', labelKey: 'tabs.cargo' },
    { id: 'crew', labelKey: 'tabs.crew' },
    { id: 'passengers', labelKey: 'tabs.passengers' },
    { id: 'operations', labelKey: 'tabs.operations' },
    { id: 'agents', labelKey: 'tabs.agents' },
    { id: 'security', labelKey: 'tabs.security' },
    { id: 'fees', labelKey: 'tabs.fees' },
    { id: 'attachments', labelKey: 'tabs.attachments' },
  ];

  const { data: portCall, isLoading } = useQuery({
    queryKey: ['portCall', id],
    queryFn: () => api.get(`/port-calls/${id}`),
  });

  const { data: opsSites } = useQuery({
    queryKey: ['opsSites'],
    queryFn: () => api.get('/ops-sites'),
  });

  const { data: aisPosition } = useQuery({
    queryKey: ['ais', 'position', portCall?.vesselId],
    queryFn: () => api.get(`/ais/vessels/${portCall?.vesselId}/last-position`),
    enabled: !!portCall?.vesselId,
  });

  const { data: aisTrack } = useQuery({
    queryKey: ['ais', 'track', portCall?.vesselId],
    queryFn: () => api.get(`/ais/vessels/${portCall?.vesselId}/track?hours=72`),
    enabled: !!portCall?.vesselId,
  });

  if (isLoading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  if (!portCall) {
    return <div className={styles.error}>{t('portCallDetail.comingSoon')}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/port-calls')}>
          ← {t('common.back')}
        </button>
        <div className={styles.headerContent}>
          <div>
            <h1>{portCall.vessel?.name || 'Unknown Vessel'}</h1>
            <p className={styles.subtitle}>
              {portCall.port?.name || portCall.portId} • {portCall.countryCode}
            </p>
          </div>
          <Badge status={portCall.status}>
            {t(`portCalls.status.${portCall.status}`) || portCall.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <div className={styles.hero}>
        <div className={styles.mapContainer}>
          <MapView
            position={aisPosition}
            track={aisTrack}
            vesselName={portCall.vessel?.name}
          />
        </div>
        <div className={styles.kpis}>
          <KpiCard title={t('portCallDetail.stayDuration')} value="2.5 days" icon="⏱️" />
          <KpiCard title={t('portCallDetail.blCount')} value={portCall.blCount || 0} icon="📦" />
          <KpiCard title={t('dashboard.people')} value={portCall.peopleCount || 0} icon="👥" />
          <KpiCard title={t('portCallDetail.feesStatus')} value="Paid" icon="💰" />
        </div>
      </div>

      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <Card>
            <h2>{t('portCallDetail.generalDeclaration')}</h2>
            <div className={styles.detailsGrid}>
              <div>
                <label>{t('portCallDetail.vesselName')}</label>
                <p>{portCall.vessel?.name}</p>
              </div>
              <div>
                <label>{t('portCallDetail.imo')}</label>
                <p>{portCall.vessel?.imo}</p>
              </div>
              <div>
                <label>{t('portCallDetail.mmsi')}</label>
                <p>{portCall.vessel?.mmsi}</p>
              </div>
              <div>
                <label>{t('portCallDetail.callSign')}</label>
                <p>{portCall.vessel?.callSign}</p>
              </div>
              <div>
                <label>{t('portCallDetail.flag')}</label>
                <p>{portCall.vessel?.flag}</p>
              </div>
              <div>
                <label>{t('portCallDetail.port')}</label>
                <p>{portCall.port?.name}</p>
              </div>
              <div>
                <label>{t('portCalls.eta')}</label>
                <p>{new Date(portCall.eta).toLocaleString()}</p>
              </div>
              <div>
                <label>{t('portCalls.etd')}</label>
                <p>{new Date(portCall.etd).toLocaleString()}</p>
              </div>
              {portCall.localReferenceNumber && (
                <div>
                  <label>{t('portCallDetail.localReference')}</label>
                  <p>{portCall.localReferenceNumber}</p>
                </div>
              )}
              {portCall.previousOpsSiteId && (
                <div>
                  <label>{t('opsSites.previousOpsSite')}</label>
                  <p>
                    {opsSites?.find((s) => s.id === portCall.previousOpsSiteId)?.name || 
                     portCall.previousOpsSiteId}
                  </p>
                </div>
              )}
              {portCall.opsSiteId && (
                <div>
                  <label>{t('opsSites.currentOpsSite')}</label>
                  <p>
                    {opsSites?.find((s) => s.id === portCall.opsSiteId)?.name || 
                     portCall.opsSiteId}
                  </p>
                </div>
              )}
              {portCall.nextOpsSiteId && (
                <div>
                  <label>{t('opsSites.nextOpsSite')}</label>
                  <p>
                    {opsSites?.find((s) => s.id === portCall.nextOpsSiteId)?.name || 
                     portCall.nextOpsSiteId}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'cargo' && (
          <Card>
            <h2>{t('tabs.cargo')}</h2>
            <p className={styles.comingSoon}>{t('portCallDetail.comingSoon')}</p>
          </Card>
        )}

        {activeTab === 'crew' && (
          <Card>
            <h2>Crew List</h2>
            <p className={styles.comingSoon}>Crew list coming soon...</p>
          </Card>
        )}

        {activeTab === 'passengers' && (
          <Card>
            <h2>Passenger List</h2>
            <p className={styles.comingSoon}>Passenger list coming soon...</p>
          </Card>
        )}

        {activeTab === 'operations' && (
          <Card>
            <h2>Operations Timeline</h2>
            <p className={styles.comingSoon}>Operations timeline coming soon...</p>
          </Card>
        )}

        {activeTab === 'agents' && <PortCallAgentsTab portCallId={id} />}

        {activeTab === 'security' && (
          <Card>
            <h2>Security & Approvals</h2>
            <p className={styles.comingSoon}>Security details coming soon...</p>
          </Card>
        )}

        {activeTab === 'fees' && (
          <Card>
            <h2>Fees & Dues</h2>
            <p className={styles.comingSoon}>Fees details coming soon...</p>
          </Card>
        )}

        {activeTab === 'attachments' && (
          <Card>
            <h2>Attachments</h2>
            <p className={styles.comingSoon}>Attachments coming soon...</p>
          </Card>
        )}
      </div>
    </div>
  );
}

// Port Call Agents Tab Component
function PortCallAgentsTab({ portCallId }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState('');

  const { data: associatedAgents, isLoading: agentsLoading } = useQuery({
    queryKey: ['portCall', portCallId, 'agents'],
    queryFn: () => api.get(`/agents/port-calls/${portCallId}`),
    enabled: !!portCallId,
  });

  const { data: allAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get('/agents'),
  });

  const associateMutation = useMutation({
    mutationFn: (agentId) => api.post(`/agents/port-calls/${portCallId}`, { agentId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['portCall', portCallId, 'agents']);
      setSelectedAgentId('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (agentId) => api.delete(`/agents/port-calls/${portCallId}/${agentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['portCall', portCallId, 'agents']);
    },
  });

  const availableAgents = allAgents?.filter(
    (a) => !associatedAgents?.some((aa) => aa.id === a.id)
  ) || [];

  if (agentsLoading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  return (
    <Card>
      <h2>{t('tabs.agents')}</h2>
      <div className={styles.agentsSection}>
        <div className={styles.addAgentSection}>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className={styles.agentSelect}
          >
            <option value="">{t('portCalls.selectAgent')}</option>
            {availableAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} {agent.role ? `(${agent.role})` : ''}
              </option>
            ))}
          </select>
          <button
            className={styles.addButton}
            onClick={() => {
              if (selectedAgentId) {
                associateMutation.mutate(selectedAgentId);
              }
            }}
            disabled={!selectedAgentId || associateMutation.isPending}
          >
            {t('portCalls.addAgent')}
          </button>
        </div>

        {associatedAgents && associatedAgents.length > 0 ? (
          <div className={styles.agentsList}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('agents.name')}</th>
                  <th>{t('agents.role')}</th>
                  <th>{t('agents.email')}</th>
                  <th>{t('agents.phone')}</th>
                  <th>{t('common.delete')}</th>
                </tr>
              </thead>
              <tbody>
                {associatedAgents.map((agent) => (
                  <tr key={agent.id}>
                    <td>{agent.name}</td>
                    <td>{agent.role || '-'}</td>
                    <td>{agent.email || '-'}</td>
                    <td>{agent.phone || '-'}</td>
                    <td>
                      <button
                        className={styles.deleteButton}
                        onClick={() => removeMutation.mutate(agent.id)}
                        disabled={removeMutation.isPending}
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.empty}>{t('portCalls.noAgents')}</div>
        )}
      </div>
    </Card>
  );
}

export default PortCallDetail;

