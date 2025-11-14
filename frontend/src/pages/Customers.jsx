import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../utils/useI18n';
import { api } from '../utils/api';
import Card from '../components/ui/Card';
import styles from './Customers.module.css';

function Customers() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [formData, setFormData] = useState({
    isForeignCompany: false,
    cnpj: '',
    foreignRegistrationNo: '',
    razaoSocial: '',
    nomeFantasia: '',
    email: '',
    telefone: '',
    celular: '',
    endereco: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    pais: 'BR',
    contatoNome: '',
    contatoCargo: '',
    contatoEmail: '',
    contatoTelefone: '',
    inscricaoEstadual: '',
    inscricaoMunicipal: '',
    website: '',
    observacoes: '',
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setIsAdding(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setEditingId(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
    },
  });

  const resetForm = () => {
    setFormData({
      isForeignCompany: false,
      cnpj: '',
      foreignRegistrationNo: '',
      razaoSocial: '',
      nomeFantasia: '',
      email: '',
      telefone: '',
      celular: '',
      endereco: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
      pais: 'BR',
      contatoNome: '',
      contatoCargo: '',
      contatoEmail: '',
      contatoTelefone: '',
      inscricaoEstadual: '',
      inscricaoMunicipal: '',
      website: '',
      observacoes: '',
    });
  };

  const handleEdit = (customer) => {
    setEditingId(customer.id);
    setIsAdding(false);
    setActiveTab('form');
    setFormData({
      isForeignCompany: customer.isForeignCompany || false,
      cnpj: customer.cnpj || '',
      foreignRegistrationNo: customer.foreignRegistrationNo || '',
      razaoSocial: customer.razaoSocial || '',
      nomeFantasia: customer.nomeFantasia || '',
      email: customer.email || '',
      telefone: customer.telefone || '',
      celular: customer.celular || '',
      endereco: customer.endereco || '',
      complemento: customer.complemento || '',
      bairro: customer.bairro || '',
      cidade: customer.cidade || '',
      estado: customer.estado || '',
      cep: customer.cep || '',
      pais: customer.pais || 'BR',
      contatoNome: customer.contatoNome || '',
      contatoCargo: customer.contatoCargo || '',
      contatoEmail: customer.contatoEmail || '',
      contatoTelefone: customer.contatoTelefone || '',
      inscricaoEstadual: customer.inscricaoEstadual || '',
      inscricaoMunicipal: customer.inscricaoMunicipal || '',
      website: customer.website || '',
      observacoes: customer.observacoes || '',
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

  // Format CNPJ input (XX.XXX.XXX/XXXX-XX)
  const formatCNPJ = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return value;
  };

  // Format CEP input (XXXXX-XXX)
  const formatCEP = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 8) {
      return numbers.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  // Format phone input
  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d)/, '+55 $1 $2').replace(/(\d{4,5})(\d{4})$/, '$1-$2');
    }
    return value;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.razaoSocial) {
      alert(t('customers.razaoSocialRequired'));
      return;
    }
    
    if (!formData.isForeignCompany && !formData.cnpj) {
      alert(t('customers.cnpjRequired'));
      return;
    }
    
    if (formData.isForeignCompany && !formData.foreignRegistrationNo) {
      alert(t('customers.foreignRegistrationRequired'));
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
    if (window.confirm(t('customers.deleteConfirm'))) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  const brazilianStates = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  const tabs = [
    { id: 'form', labelKey: 'customers.tabs.details' },
    { id: 'vessels', labelKey: 'customers.tabs.vessels', hidden: !editingId },
    { id: 'agents', labelKey: 'customers.tabs.agents', hidden: !editingId },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>{t('customers.title')}</h1>
          <p>{t('customers.subtitle')}</p>
        </div>
        {!isAdding && !editingId && (
          <button className={styles.addButton} onClick={handleAdd}>
            + {t('customers.addNew')}
          </button>
        )}
      </div>

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
              <h2>{editingId ? t('customers.edit') : t('customers.addNew')}</h2>
              <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formSection}>
              <h3>{t('customers.companyInfo')}</h3>
              <div className={styles.formGrid}>
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.isForeignCompany}
                      onChange={(e) => {
                        const isForeign = e.target.checked;
                        setFormData({
                          ...formData,
                          isForeignCompany: isForeign,
                          // Clear CNPJ if switching to foreign, clear foreign reg if switching to Brazilian
                          cnpj: isForeign ? '' : formData.cnpj,
                          foreignRegistrationNo: isForeign ? formData.foreignRegistrationNo : '',
                        });
                      }}
                      className={styles.checkbox}
                    />
                    <span>{t('customers.isForeignCompany')}</span>
                  </label>
                </div>
                {!formData.isForeignCompany ? (
                  <div className={styles.field}>
                    <label>{t('customers.cnpj')} *</label>
                    <input
                      type="text"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      required={!formData.isForeignCompany}
                    />
                  </div>
                ) : (
                  <div className={styles.field}>
                    <label>{t('customers.foreignRegistrationNo')} *</label>
                    <input
                      type="text"
                      value={formData.foreignRegistrationNo}
                      onChange={(e) => setFormData({ ...formData, foreignRegistrationNo: e.target.value })}
                      placeholder={t('customers.foreignRegistrationPlaceholder')}
                      required={formData.isForeignCompany}
                    />
                  </div>
                )}
                <div className={styles.field}>
                  <label>{t('customers.razaoSocial')} *</label>
                  <input
                    type="text"
                    value={formData.razaoSocial}
                    onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label>{t('customers.nomeFantasia')}</label>
                  <input
                    type="text"
                    value={formData.nomeFantasia}
                    onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label>{t('customers.email')}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label>{t('customers.telefone')}</label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                    placeholder="+55 21 1234-5678"
                  />
                </div>
                <div className={styles.field}>
                  <label>{t('customers.celular')}</label>
                  <input
                    type="text"
                    value={formData.celular}
                    onChange={(e) => setFormData({ ...formData, celular: formatPhone(e.target.value) })}
                    placeholder="+55 21 98765-4321"
                  />
                </div>
                <div className={styles.field}>
                  <label>{t('customers.inscricaoEstadual')}</label>
                  <input
                    type="text"
                    value={formData.inscricaoEstadual}
                    onChange={(e) => setFormData({ ...formData, inscricaoEstadual: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label>{t('customers.inscricaoMunicipal')}</label>
                  <input
                    type="text"
                    value={formData.inscricaoMunicipal}
                    onChange={(e) => setFormData({ ...formData, inscricaoMunicipal: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label>{t('customers.website')}</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://www.example.com.br"
                  />
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h3>{t('customers.addressInfo')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>{t('customers.endereco')}</label>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label>{t('customers.complemento')}</label>
                  <input
                    type="text"
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label>{t('customers.bairro')}</label>
                  <input
                    type="text"
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label>{t('customers.cidade')}</label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label>{t('customers.estado')}</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  >
                    <option value="">{t('customers.selectState')}</option>
                    {brazilianStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>{t('customers.cep')}</label>
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: formatCEP(e.target.value) })}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
                <div className={styles.field}>
                  <label>{t('customers.pais')}</label>
                  <input
                    type="text"
                    value={formData.pais}
                    onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h3>{t('customers.contactInfo')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>{t('customers.contatoNome')}</label>
                  <input
                    type="text"
                    value={formData.contatoNome}
                    onChange={(e) => setFormData({ ...formData, contatoNome: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label>{t('customers.contatoCargo')}</label>
                  <input
                    type="text"
                    value={formData.contatoCargo}
                    onChange={(e) => setFormData({ ...formData, contatoCargo: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label>{t('customers.contatoEmail')}</label>
                  <input
                    type="email"
                    value={formData.contatoEmail}
                    onChange={(e) => setFormData({ ...formData, contatoEmail: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label>{t('customers.contatoTelefone')}</label>
                  <input
                    type="text"
                    value={formData.contatoTelefone}
                    onChange={(e) => setFormData({ ...formData, contatoTelefone: formatPhone(e.target.value) })}
                    placeholder="+55 21 1234-5678"
                  />
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h3>{t('customers.additionalInfo')}</h3>
              <div className={styles.field}>
                <label>{t('customers.observacoes')}</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={4}
                  className={styles.textarea}
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {t('customers.save')}
              </button>
              <button type="button" className={styles.cancelButton} onClick={handleCancel}>
                {t('customers.cancel')}
              </button>
            </div>
          </form>
        </Card>
          )}
          {activeTab === 'vessels' && editingId && <CustomerVesselsTab customerId={editingId} />}
          {activeTab === 'agents' && editingId && <CustomerAgentsTab customerId={editingId} />}
        </div>
      )}

      {!isAdding && !editingId && (
      <Card>
        {customers?.length > 0 ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('customers.isForeignCompany')}</th>
                  <th>{t('customers.cnpj')} / {t('customers.foreignRegistrationNo')}</th>
                  <th>{t('customers.razaoSocial')}</th>
                  <th>{t('customers.nomeFantasia')}</th>
                  <th>{t('customers.cidade')}</th>
                  <th>{t('customers.estado')}</th>
                  <th>{t('customers.email')}</th>
                  <th>{t('common.edit')}</th>
                  <th>{t('common.delete')}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      {customer.isForeignCompany ? (
                        <span className={styles.foreignBadge}>{t('customers.foreign')}</span>
                      ) : (
                        <span className={styles.brazilianBadge}>{t('customers.brazilian')}</span>
                      )}
                    </td>
                    <td>
                      {customer.isForeignCompany 
                        ? customer.foreignRegistrationNo || '-'
                        : customer.cnpj || '-'
                      }
                    </td>
                    <td>{customer.razaoSocial}</td>
                    <td>{customer.nomeFantasia || '-'}</td>
                    <td>{customer.cidade || '-'}</td>
                    <td>{customer.estado || '-'}</td>
                    <td>{customer.email || '-'}</td>
                    <td>
                      <button
                        className={styles.editButton}
                        onClick={() => handleEdit(customer)}
                        disabled={editingId !== null || isAdding}
                      >
                        {t('common.edit')}
                      </button>
                    </td>
                    <td>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(customer.id)}
                        disabled={deleteMutation.isPending}
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
          <div className={styles.empty}>{t('customers.noCustomers')}</div>
        )}
      </Card>
      )}
    </div>
  );
}

// Customer Vessels Tab Component
function CustomerVesselsTab({ customerId }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedVesselId, setSelectedVesselId] = useState('');

  const { data: associatedVessels, isLoading: vesselsLoading } = useQuery({
    queryKey: ['customer', customerId, 'vessels'],
    queryFn: () => api.get(`/customers/${customerId}/vessels`),
    enabled: !!customerId,
  });

  const { data: allVessels } = useQuery({
    queryKey: ['vessels'],
    queryFn: () => api.get('/vessels'),
  });

  const associateMutation = useMutation({
    mutationFn: (vesselId) => api.post(`/customers/${customerId}/vessels`, { vesselId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer', customerId, 'vessels']);
      setSelectedVesselId('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (vesselId) => api.delete(`/customers/${customerId}/vessels/${vesselId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer', customerId, 'vessels']);
    },
  });

  const availableVessels = allVessels?.filter(
    (v) => !associatedVessels?.some((av) => av.id === v.id)
  ) || [];

  if (vesselsLoading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  return (
    <Card>
      <h2>{t('customers.tabs.vessels')}</h2>
      <div className={styles.vesselsSection}>
        <div className={styles.addVesselSection}>
          <select
            value={selectedVesselId}
            onChange={(e) => setSelectedVesselId(e.target.value)}
            className={styles.vesselSelect}
          >
            <option value="">{t('customers.selectVessel')}</option>
            {availableVessels.map((vessel) => (
              <option key={vessel.id} value={vessel.id}>
                {vessel.name} {vessel.imo ? `(IMO: ${vessel.imo})` : ''}
              </option>
            ))}
          </select>
          <button
            className={styles.addButton}
            onClick={() => {
              if (selectedVesselId) {
                associateMutation.mutate(selectedVesselId);
              }
            }}
            disabled={!selectedVesselId || associateMutation.isPending}
          >
            {t('customers.addVessel')}
          </button>
        </div>

        {associatedVessels && associatedVessels.length > 0 ? (
          <div className={styles.vesselsList}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('vessels.name')}</th>
                  <th>IMO</th>
                  <th>MMSI</th>
                  <th>{t('vessels.flag')}</th>
                  <th>{t('common.delete')}</th>
                </tr>
              </thead>
              <tbody>
                {associatedVessels.map((vessel) => (
                  <tr key={vessel.id}>
                    <td>{vessel.name}</td>
                    <td>{vessel.imo || '-'}</td>
                    <td>{vessel.mmsi || '-'}</td>
                    <td>{vessel.flag || '-'}</td>
                    <td>
                      <button
                        className={styles.deleteButton}
                        onClick={() => removeMutation.mutate(vessel.id)}
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
          <div className={styles.empty}>{t('customers.noVessels')}</div>
        )}
      </div>
    </Card>
  );
}

// Customer Agents Tab Component
function CustomerAgentsTab({ customerId }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState('');

  const { data: associatedAgents, isLoading: agentsLoading } = useQuery({
    queryKey: ['customer', customerId, 'agents'],
    queryFn: () => api.get(`/agents/customers/${customerId}`),
    enabled: !!customerId,
  });

  const { data: allAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get('/agents'),
  });

  const associateMutation = useMutation({
    mutationFn: (agentId) => api.post(`/agents/customers/${customerId}`, { agentId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer', customerId, 'agents']);
      setSelectedAgentId('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (agentId) => api.delete(`/agents/customers/${customerId}/${agentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer', customerId, 'agents']);
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
      <h2>{t('customers.tabs.agents')}</h2>
      <div className={styles.vesselsSection}>
        <div className={styles.addVesselSection}>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className={styles.vesselSelect}
          >
            <option value="">{t('customers.selectAgent')}</option>
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
            {t('customers.addAgent')}
          </button>
        </div>

        {associatedAgents && associatedAgents.length > 0 ? (
          <div className={styles.vesselsList}>
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
          <div className={styles.empty}>{t('customers.noAgents')}</div>
        )}
      </div>
    </Card>
  );
}

export default Customers;

