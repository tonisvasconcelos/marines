import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../../utils/useI18n';
import { api } from '../../utils/api';
import Card from '../../components/ui/Card';
import KpiCard from '../../components/ui/KpiCard';
import MapView from '../../components/ais/MapView';
import styles from './VesselDetail.module.css';

function VesselDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: vessel, isLoading } = useQuery({
    queryKey: ['vessel', id],
    queryFn: () => api.get(`/vessels/${id}`),
  });

  const { data: portCalls } = useQuery({
    queryKey: ['vessel', id, 'portCalls'],
    queryFn: () => api.get(`/port-calls?vesselId=${id}`),
    enabled: !!vessel,
  });

  const { data: position, isLoading: positionLoading } = useQuery({
    queryKey: ['vessel', id, 'position'],
    queryFn: () => api.get(`/vessels/${id}/position`),
    enabled: !!vessel && (!!vessel.imo || !!vessel.mmsi),
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!vessel) {
    return <div className={styles.error}>{t('vessels.notFound')}</div>;
  }

  const tabs = [
    { id: 'overview', labelKey: 'vessels.tabs.overview' },
    { id: 'customers', labelKey: 'vessels.tabs.customers' },
    { id: 'agents', labelKey: 'vessels.tabs.agents' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/vessels')}>
          ← {t('common.back')}
        </button>
        <div className={styles.headerContent}>
          <div className={styles.vesselInfo}>
            <h1>{vessel.name}</h1>
            <p className={styles.subtitle}>
              IMO: {vessel.imo} • MMSI: {vessel.mmsi} • {vessel.flag}
            </p>
          </div>
          <div className={styles.vesselImageContainer}>
            {vessel.imageUrl ? (
              <img 
                src={vessel.imageUrl} 
                alt={vessel.name}
                className={styles.vesselImage}
                onError={(e) => {
                  e.target.style.display = 'none';
                  const placeholder = e.target.parentElement.querySelector(`.${styles.vesselImagePlaceholder}`);
                  if (placeholder) placeholder.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={styles.vesselImagePlaceholder}
              style={{ display: vessel.imageUrl ? 'none' : 'flex' }}
            >
              <span className={styles.placeholderIcon}>🚢</span>
              <span className={styles.placeholderText}>{t('vessels.photo')}</span>
            </div>
          </div>
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
          <>
            <div className={styles.stats}>
              <KpiCard title={t('vessels.totalPortCalls')} value={portCalls?.length || 0} icon="🚢" />
              <KpiCard title={t('vessels.portsVisited')} value="12" icon="📍" />
              <KpiCard title={t('vessels.avgStayDuration')} value="2.5 days" icon="⏱️" />
              <KpiCard title={t('vessels.totalCargo')} value="1,234" icon="📦" />
            </div>

            {(vessel.imo || vessel.mmsi) && (
              <div className={styles.section}>
                <h2>{t('vessels.currentPosition')}</h2>
                {positionLoading ? (
                  <div className={styles.loading}>{t('vessels.loadingPosition')}</div>
                ) : position ? (
                  <Card className={styles.mapCard}>
                    <MapView
                      position={position}
                      vesselName={vessel.name}
                    />
                  </Card>
                ) : (
                  <div className={styles.empty}>
                    {t('vessels.noAisData')}
                  </div>
                )}
              </div>
            )}

            <div className={styles.section}>
              <h2>{t('vessels.portCallHistory')}</h2>
              {portCalls && portCalls.length > 0 ? (
                <div className={styles.portCallsList}>
                  {portCalls.map((pc) => (
                    <Card
                      key={pc.id}
                      className={styles.portCallCard}
                      onClick={() => navigate(`/port-calls/${pc.id}`)}
                    >
                      <div className={styles.portCallHeader}>
                        <div>
                          <h3>{pc.port?.name || pc.portId}</h3>
                          <p>
                            {new Date(pc.eta).toLocaleDateString()} -{' '}
                            {new Date(pc.etd).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className={styles.empty}>{t('vessels.noPortCalls')}</div>
              )}
            </div>
          </>
        )}

        {activeTab === 'customers' && <VesselCustomersTab vesselId={id} />}
        {activeTab === 'agents' && <VesselAgentsTab vesselId={id} />}
      </div>
    </div>
  );
}

// Vessel Customers Tab Component
function VesselCustomersTab({ vesselId }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const { data: associatedCustomers, isLoading: customersLoading } = useQuery({
    queryKey: ['vessel', vesselId, 'customers'],
    queryFn: () => api.get(`/vessels/${vesselId}/customers`),
    enabled: !!vesselId,
  });

  const { data: allCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers'),
  });

  const associateMutation = useMutation({
    mutationFn: (customerId) => api.post(`/vessels/${vesselId}/customers`, { customerId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['vessel', vesselId, 'customers']);
      setSelectedCustomerId('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (customerId) => api.delete(`/vessels/${vesselId}/customers/${customerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['vessel', vesselId, 'customers']);
    },
  });

  const availableCustomers = allCustomers?.filter(
    (c) => !associatedCustomers?.some((ac) => ac.id === c.id)
  ) || [];

  if (customersLoading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  return (
    <Card>
      <h2>{t('vessels.tabs.customers')}</h2>
      <div className={styles.customersSection}>
        <div className={styles.addCustomerSection}>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className={styles.customerSelect}
          >
            <option value="">{t('vessels.selectCustomer')}</option>
            {availableCustomers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.razaoSocial} {customer.nomeFantasia ? `(${customer.nomeFantasia})` : ''}
              </option>
            ))}
          </select>
          <button
            className={styles.addButton}
            onClick={() => {
              if (selectedCustomerId) {
                associateMutation.mutate(selectedCustomerId);
              }
            }}
            disabled={!selectedCustomerId || associateMutation.isPending}
          >
            {t('vessels.addCustomer')}
          </button>
        </div>

        {associatedCustomers && associatedCustomers.length > 0 ? (
          <div className={styles.customersList}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('customers.razaoSocial')}</th>
                  <th>{t('customers.nomeFantasia')}</th>
                  <th>{t('customers.cnpj')} / {t('customers.foreignRegistrationNo')}</th>
                  <th>{t('customers.email')}</th>
                  <th>{t('common.delete')}</th>
                </tr>
              </thead>
              <tbody>
                {associatedCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.razaoSocial}</td>
                    <td>{customer.nomeFantasia || '-'}</td>
                    <td>
                      {customer.isForeignCompany 
                        ? customer.foreignRegistrationNo || '-'
                        : customer.cnpj || '-'
                      }
                    </td>
                    <td>{customer.email || '-'}</td>
                    <td>
                      <button
                        className={styles.deleteButton}
                        onClick={() => removeMutation.mutate(customer.id)}
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
          <div className={styles.empty}>{t('vessels.noCustomers')}</div>
        )}
      </div>
    </Card>
  );
}

// Vessel Agents Tab Component
function VesselAgentsTab({ vesselId }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState('');

  const { data: associatedAgents, isLoading: agentsLoading } = useQuery({
    queryKey: ['vessel', vesselId, 'agents'],
    queryFn: () => api.get(`/agents/vessels/${vesselId}`),
    enabled: !!vesselId,
  });

  const { data: allAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get('/agents'),
  });

  const associateMutation = useMutation({
    mutationFn: (agentId) => api.post(`/agents/vessels/${vesselId}`, { agentId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['vessel', vesselId, 'agents']);
      setSelectedAgentId('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (agentId) => api.delete(`/agents/vessels/${vesselId}/${agentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['vessel', vesselId, 'agents']);
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
      <h2>{t('vessels.tabs.agents')}</h2>
      <div className={styles.customersSection}>
        <div className={styles.addCustomerSection}>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className={styles.customerSelect}
          >
            <option value="">{t('vessels.selectAgent')}</option>
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
            {t('vessels.addAgent')}
          </button>
        </div>

        {associatedAgents && associatedAgents.length > 0 ? (
          <div className={styles.customersList}>
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
          <div className={styles.empty}>{t('vessels.noAgents')}</div>
        )}
      </div>
    </Card>
  );
}

export default VesselDetail;

