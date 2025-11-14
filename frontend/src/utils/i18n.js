// Comprehensive i18n system with React context support

const translations = {
  'en-US': {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      portCalls: 'Port Calls',
      fleetMap: 'Fleet Map',
      vessels: 'Vessels',
      people: 'Crew',
      security: 'Security & Pendencies',
      fees: 'Fees & Dues',
      opsSites: 'Ops. Sites',
      tenantSettings: 'Tenant Settings',
      users: 'Users',
      aisConfig: 'AIS Config',
      logout: 'Logout',
      operations: 'Operations',
      vesselsPeople: 'Vessels & Crew',
      compliance: 'Compliance',
      administration: 'Administration',
      agents: 'Agents',
      customers: 'Customers',
    },
    // Common
    common: {
      loading: 'Loading...',
      save: 'Save Changes',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      search: 'Search',
      filter: 'Filter',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      close: 'Close',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
    },
    // Login
    login: {
      title: 'Marines App',
      subtitle: 'Port Call Management System',
      email: 'Email',
      password: 'Password',
      loginButton: 'Login',
      loggingIn: 'Logging in...',
      demoCredentials: 'Demo credentials:',
      demoEmail: 'Email: demo@marines.app | Password: demo123',
    },
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Recent port call activities',
      recentPortCalls: 'Recent Port Calls',
      activePortCalls: 'Active Port Calls',
      shipsAtSea: 'Ships at Sea',
      pendingIssues: 'Pending Issues',
      totalCargo: 'Total Cargo',
      inProgress: 'In progress',
      enRoute: 'En route',
      requiresAttention: 'Requires attention',
      thisMonth: 'This month',
      noPortCalls: 'No port calls found',
      cargo: 'cargo',
      people: 'people',
      issues: 'issues',
      operationsCenter: 'OPERATIONS CENTER',
      maritimeAwareness: 'Maritime Situational Awareness Dashboard',
      live: 'LIVE',
      vesselsInPort: 'Vessels in Port',
      vesselsAnchored: 'Vessels Anchored',
      arrivals24h: 'Arrivals (24h)',
      departures24h: 'Departures (24h)',
      situationalAwareness: 'SITUATIONAL AWARENESS',
      vesselStatus: 'Vessel Status',
      portOperations: 'Port Operations',
      alerts: 'Alerts',
      inbound: 'Inbound',
      inPort: 'In Port',
      atSea: 'At Sea',
      anchored: 'Anchored',
      securityIssues: 'Security Issues',
      opsLog: 'OPS LOG',
      noEvents: 'No events',
    },
    // Port Calls
    portCalls: {
      title: 'Port Calls',
      newPortCall: 'New Port Call',
      eta: 'ETA',
      etd: 'ETD',
      ref: 'Ref',
      status: {
        PLANNED: 'Planned',
        IN_PROGRESS: 'In Progress',
        COMPLETED: 'Completed',
        CANCELLED: 'Cancelled',
      },
      selectAgent: 'Select Agent',
      addAgent: 'Add Agent',
      noAgents: 'No agents assigned to this port call',
    },
    // Port Call Detail
    portCallDetail: {
      generalDeclaration: 'General Declaration',
      vesselName: 'Vessel Name',
      imo: 'IMO',
      mmsi: 'MMSI',
      callSign: 'Call Sign',
      flag: 'Flag',
      port: 'Port',
      localReference: 'Local Reference',
      stayDuration: 'Stay Duration',
      blCount: 'BL Count',
      feesStatus: 'Fees Status',
      comingSoon: 'coming soon...',
    },
    // Settings
    settings: {
      tenant: {
        title: 'Tenant Settings',
        subtitle: 'Manage your organization settings',
        organizationName: 'Organization Name',
        defaultCountry: 'Default Country',
        defaultLocale: 'Default Locale',
        saveChanges: 'Save Changes',
      },
      users: {
        title: 'Users',
        subtitle: 'Manage user access and roles',
        name: 'Name',
        email: 'Email',
        role: 'Role',
        actions: 'Actions',
        addUser: 'Add User',
      },
      ais: {
        title: 'AIS Configuration',
        subtitle: 'Configure AIS data provider and polling settings',
        provider: 'AIS Provider',
        apiKey: 'API Key',
        pollFrequency: 'Poll Frequency (minutes)',
        trackHistory: 'Track History (hours)',
        saveConfiguration: 'Save Configuration',
      },
    },
    // Tabs
    tabs: {
      overview: 'Overview',
      cargo: 'Cargo',
      crew: 'Crew',
      passengers: 'Passengers',
      operations: 'Operations',
      agents: 'Agents',
      security: 'Security & Approvals',
      fees: 'Fees & Dues',
      attachments: 'Attachments',
    },
    // Vessels
    vessels: {
      title: 'Vessels',
      newVessel: 'New Vessel',
      portCallHistory: 'Port Call History',
      totalPortCalls: 'Total Port Calls',
      portsVisited: 'Ports Visited',
      avgStayDuration: 'Avg Stay Duration',
      totalCargo: 'Total Cargo',
      flag: 'Flag',
      name: 'Name',
      notFound: 'Vessel not found',
      photo: 'Vessel Photo',
      currentPosition: 'Current Position (AIS)',
      loadingPosition: 'Loading vessel position...',
      noAisData: 'No AIS position data available. Make sure AIS settings are configured and the vessel has a valid IMO or MMSI.',
      noPortCalls: 'No port calls found',
      tabs: {
        overview: 'Overview',
        customers: 'Customers',
        agents: 'Agents',
      },
      selectCustomer: 'Select Customer',
      addCustomer: 'Add Customer',
      noCustomers: 'No customers associated with this vessel',
      selectAgent: 'Select Agent',
      addAgent: 'Add Agent',
      noAgents: 'No agents associated with this vessel',
    },
    // Crew
    people: {
      title: 'Crew',
      subtitle: 'Crew members across active port calls',
      comingSoon: 'Crew management coming soon...',
    },
    // Security
    security: {
      title: 'Security & Pendencies',
      subtitle: 'Traveler pendencies and security holds',
      comingSoon: 'Security management coming soon...',
    },
    // Fees
    fees: {
      title: 'Fees & Dues',
      subtitle: 'Port charges and fees management',
      comingSoon: 'Fees management coming soon...',
    },
    // Fleet Map
    fleetMap: {
      title: 'Fleet Map',
      inProgress: 'In Progress',
      planned: 'Planned',
    },
    // Ops Sites
    opsSites: {
      title: 'Ops. Sites',
      subtitle: 'Manage operational areas (Anchored Zones, Ports, Terminals, Berths)',
      name: 'Name',
      code: 'Code',
      type: 'Type',
      country: 'Country',
      parent: 'Parent',
      latitude: 'Latitude',
      longitude: 'Longitude',
      addNew: 'Add New Site',
      edit: 'Edit Site',
      delete: 'Delete Site',
      save: 'Save',
      cancel: 'Cancel',
      noSites: 'No operational sites found',
      noParent: 'No Parent',
      parentHelp: 'Select a parent site if this area is inside another (e.g., an anchored zone inside a port)',
      coordinateHelp: 'Note: Latitude and Longitude should have 6 decimal places',
      types: {
        ANCHORED_ZONE: 'Anchored Zone',
        PORT: 'Port',
        TERMINAL: 'Terminal',
        BERTH: 'Berth',
      },
      previousOpsSite: 'Previous Ops. Site',
      nextOpsSite: 'Next Ops. Site',
      currentOpsSite: 'Ops. Site',
    },
    // Customers
    customers: {
      title: 'Customers',
      subtitle: 'Register and manage customer companies',
      addNew: 'Add New Customer',
      edit: 'Edit Customer',
      save: 'Save',
      cancel: 'Cancel',
      deleteConfirm: 'Are you sure you want to delete this customer?',
      noCustomers: 'No customers found',
      companyInfo: 'Company Information',
      addressInfo: 'Address Information',
      contactInfo: 'Contact Information',
      additionalInfo: 'Additional Information',
      isForeignCompany: 'Foreign Company',
      cnpj: 'CNPJ',
      foreignRegistrationNo: 'Company Registration No. (Foreign)',
      foreignRegistrationPlaceholder: 'Enter foreign company registration number',
      razaoSocial: 'Company Name (Razão Social)',
      nomeFantasia: 'Trade Name (Nome Fantasia)',
      foreign: 'Foreign',
      brazilian: 'Brazilian',
      cnpjRequired: 'CNPJ is required for Brazilian companies',
      foreignRegistrationRequired: 'Company Registration No. (Foreign) is required for foreign companies',
      razaoSocialRequired: 'Company Name (Razão Social) is required',
      email: 'Email',
      telefone: 'Phone',
      celular: 'Mobile',
      endereco: 'Address',
      complemento: 'Complement',
      bairro: 'Neighborhood',
      cidade: 'City',
      estado: 'State',
      cep: 'ZIP Code (CEP)',
      pais: 'Country',
      contatoNome: 'Contact Name',
      contatoCargo: 'Contact Position',
      contatoEmail: 'Contact Email',
      contatoTelefone: 'Contact Phone',
      inscricaoEstadual: 'State Registration (IE)',
      inscricaoMunicipal: 'Municipal Registration (IM)',
      website: 'Website',
      observacoes: 'Notes',
      selectState: 'Select State',
      tabs: {
        details: 'Details',
        vessels: 'Vessels',
        agents: 'Agents',
      },
      selectVessel: 'Select Vessel',
      addVessel: 'Add Vessel',
      noVessels: 'No vessels associated with this customer',
      selectAgent: 'Select Agent',
      addAgent: 'Add Agent',
      noAgents: 'No agents associated with this customer',
    },
    // Agents
    agents: {
      title: 'Agents',
      subtitle: 'Manage operational employees and teams',
      addNew: 'Add New Agent',
      edit: 'Edit Agent',
      save: 'Save',
      cancel: 'Cancel',
      deleteConfirm: 'Are you sure you want to delete this agent?',
      noAgents: 'No agents found',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      role: 'Role',
      rolePlaceholder: 'e.g., Port Agent, Operations Manager',
      team: 'Team',
      noTeam: 'No Team',
      active: 'Active',
      inactive: 'Inactive',
      status: 'Status',
      nameRequired: 'Agent name is required',
      manageTeams: 'Manage Teams',
      tabs: {
        details: 'Details',
        teams: 'Teams',
      },
      teamInfo: 'Team assignment is managed in the Details tab.',
    },
    // Teams
    teams: {
      title: 'Teams',
      name: 'Team Name',
      description: 'Description',
      color: 'Color',
      create: 'Create Team',
      update: 'Update Team',
      deleteConfirm: 'Are you sure you want to delete this team?',
      noTeams: 'No teams found',
      existingTeams: 'Existing Teams',
      nameRequired: 'Team name is required',
    },
  },
  'pt-BR': {
    // Navigation
    nav: {
      dashboard: 'Painel',
      portCalls: 'Escalas',
      fleetMap: 'Mapa da Frota',
      vessels: 'Embarcações',
      people: 'Tripulação',
      security: 'Segurança e Pendências',
      fees: 'Taxas e Encargos',
      tenantSettings: 'Configurações',
      users: 'Usuários',
      aisConfig: 'Configuração AIS',
      logout: 'Sair',
      operations: 'Operações',
      vesselsPeople: 'Embarcações e Tripulação',
      compliance: 'Conformidade',
      administration: 'Administração',
      customers: 'Clientes',
    },
    // Common
    common: {
      loading: 'Carregando...',
      save: 'Salvar Alterações',
      cancel: 'Cancelar',
      delete: 'Excluir',
      edit: 'Editar',
      create: 'Criar',
      search: 'Buscar',
      filter: 'Filtrar',
      back: 'Voltar',
      next: 'Próximo',
      previous: 'Anterior',
      close: 'Fechar',
      confirm: 'Confirmar',
      yes: 'Sim',
      no: 'Não',
    },
    // Login
    login: {
      title: 'Marines App',
      subtitle: 'Sistema de Gestão de Escalas Portuárias',
      email: 'E-mail',
      password: 'Senha',
      loginButton: 'Entrar',
      loggingIn: 'Entrando...',
      demoCredentials: 'Credenciais de demonstração:',
      demoEmail: 'E-mail: demo@marines.app | Senha: demo123',
    },
    // Dashboard
    dashboard: {
      title: 'Painel',
      subtitle: 'Atividades recentes de escalas',
      recentPortCalls: 'Escalas Recentes',
      activePortCalls: 'Escalas Ativas',
      shipsAtSea: 'Navios no Mar',
      pendingIssues: 'Problemas Pendentes',
      totalCargo: 'Carga Total',
      inProgress: 'Em andamento',
      enRoute: 'Em rota',
      requiresAttention: 'Requer atenção',
      thisMonth: 'Este mês',
      noPortCalls: 'Nenhuma escala encontrada',
      cargo: 'carga',
      people: 'pessoas',
      issues: 'problemas',
      operationsCenter: 'CENTRO DE OPERAÇÕES',
      maritimeAwareness: 'Painel de Consciência Situacional Marítima',
      live: 'AO VIVO',
      vesselsInPort: 'Embarcações no Porto',
      vesselsAnchored: 'Embarcações Ancoradas',
      arrivals24h: 'Chegadas (24h)',
      departures24h: 'Partidas (24h)',
      situationalAwareness: 'CONSCIÊNCIA SITUACIONAL',
      vesselStatus: 'Status das Embarcações',
      portOperations: 'Operações Portuárias',
      alerts: 'Alertas',
      inbound: 'Aproximando',
      inPort: 'No Porto',
      atSea: 'No Mar',
      anchored: 'Ancorada',
      securityIssues: 'Problemas de Segurança',
      opsLog: 'LOG DE OPERAÇÕES',
      noEvents: 'Nenhum evento',
    },
    // Port Calls
    portCalls: {
      title: 'Escalas',
      newPortCall: 'Nova Escala',
      eta: 'ETA',
      etd: 'ETD',
      ref: 'Ref',
      status: {
        PLANNED: 'Planejado',
        IN_PROGRESS: 'Em Andamento',
        COMPLETED: 'Concluído',
        CANCELLED: 'Cancelado',
      },
      selectAgent: 'Selecionar Agente',
      addAgent: 'Adicionar Agente',
      noAgents: 'Nenhum agente atribuído a esta escala',
    },
    // Port Call Detail
    portCallDetail: {
      generalDeclaration: 'Declaração Geral',
      vesselName: 'Nome da Embarcação',
      imo: 'IMO',
      mmsi: 'MMSI',
      callSign: 'Indicativo de Chamada',
      flag: 'Bandeira',
      port: 'Porto',
      localReference: 'Referência Local',
      stayDuration: 'Duração da Permanência',
      blCount: 'Quantidade de BL',
      feesStatus: 'Status das Taxas',
      comingSoon: 'em breve...',
    },
    // Settings
    settings: {
      tenant: {
        title: 'Configurações',
        subtitle: 'Gerencie as configurações da sua organização',
        organizationName: 'Nome da Organização',
        defaultCountry: 'País Padrão',
        defaultLocale: 'Idioma Padrão',
        saveChanges: 'Salvar Alterações',
      },
      users: {
        title: 'Usuários',
        subtitle: 'Gerencie o acesso e as funções dos usuários',
        name: 'Nome',
        email: 'E-mail',
        role: 'Função',
        actions: 'Ações',
        addUser: 'Adicionar Usuário',
      },
      ais: {
        title: 'Configuração AIS',
        subtitle: 'Configure o provedor de dados AIS e as configurações de consulta',
        provider: 'Provedor AIS',
        apiKey: 'Chave da API',
        pollFrequency: 'Frequência de Consulta (minutos)',
        trackHistory: 'Histórico de Rastreamento (horas)',
        saveConfiguration: 'Salvar Configuração',
      },
    },
    // Tabs
    tabs: {
      overview: 'Visão Geral',
      cargo: 'Carga',
      crew: 'Tripulação',
      passengers: 'Passageiros',
      operations: 'Operações',
      agents: 'Agentes',
      security: 'Segurança e Aprovações',
      fees: 'Taxas e Encargos',
      attachments: 'Anexos',
    },
    // Vessels
    vessels: {
      title: 'Embarcações',
      newVessel: 'Nova Embarcação',
      portCallHistory: 'Histórico de Escalas',
      totalPortCalls: 'Total de Escalas',
      portsVisited: 'Portos Visitados',
      avgStayDuration: 'Duração Média de Permanência',
      totalCargo: 'Carga Total',
      flag: 'Bandeira',
      name: 'Nome',
      notFound: 'Embarcação não encontrada',
      photo: 'Foto da Embarcação',
      currentPosition: 'Posição Atual (AIS)',
      loadingPosition: 'Carregando posição da embarcação...',
      noAisData: 'Nenhum dado de posição AIS disponível. Certifique-se de que as configurações AIS estão configuradas e a embarcação tem um IMO ou MMSI válido.',
      noPortCalls: 'Nenhuma escala encontrada',
      tabs: {
        overview: 'Visão Geral',
        customers: 'Clientes',
        agents: 'Agentes',
      },
      selectCustomer: 'Selecionar Cliente',
      addCustomer: 'Adicionar Cliente',
      noCustomers: 'Nenhum cliente associado a esta embarcação',
      selectAgent: 'Selecionar Agente',
      addAgent: 'Adicionar Agente',
      noAgents: 'Nenhum agente associado a esta embarcação',
    },
    // Agents
    agents: {
      title: 'Agentes',
      subtitle: 'Gerenciar funcionários operacionais e equipes',
      addNew: 'Adicionar Novo Agente',
      edit: 'Editar Agente',
      save: 'Salvar',
      cancel: 'Cancelar',
      deleteConfirm: 'Tem certeza que deseja excluir este agente?',
      noAgents: 'Nenhum agente encontrado',
      name: 'Nome',
      email: 'E-mail',
      phone: 'Telefone',
      role: 'Função',
      rolePlaceholder: 'ex: Agente Portuário, Gerente de Operações',
      team: 'Equipe',
      noTeam: 'Sem Equipe',
      active: 'Ativo',
      inactive: 'Inativo',
      status: 'Status',
      nameRequired: 'Nome do agente é obrigatório',
      manageTeams: 'Gerenciar Equipes',
      tabs: {
        details: 'Detalhes',
        teams: 'Equipes',
      },
      teamInfo: 'A atribuição de equipe é gerenciada na aba Detalhes.',
    },
    // Teams
    teams: {
      title: 'Equipes',
      name: 'Nome da Equipe',
      description: 'Descrição',
      color: 'Cor',
      create: 'Criar Equipe',
      update: 'Atualizar Equipe',
      deleteConfirm: 'Tem certeza que deseja excluir esta equipe?',
      noTeams: 'Nenhuma equipe encontrada',
      existingTeams: 'Equipes Existentes',
      nameRequired: 'Nome da equipe é obrigatório',
    },
    // Crew
    people: {
      title: 'Tripulação',
      subtitle: 'Tripulação em escalas ativas',
      comingSoon: 'Gestão de tripulação em breve...',
    },
    // Security
    security: {
      title: 'Segurança e Pendências',
      subtitle: 'Pendências de viajantes e bloqueios de segurança',
      comingSoon: 'Gestão de segurança em breve...',
    },
    // Fees
    fees: {
      title: 'Taxas e Encargos',
      subtitle: 'Gestão de taxas e encargos portuários',
      comingSoon: 'Gestão de taxas em breve...',
    },
    // Fleet Map
    fleetMap: {
      title: 'Mapa da Frota',
      inProgress: 'Em Andamento',
      planned: 'Planejado',
    },
    // Ops Sites
    opsSites: {
      title: 'Sites Operacionais',
      subtitle: 'Gerencie áreas operacionais (Zonas de Ancoragem, Portos, Terminais, Atracadouros)',
      name: 'Nome',
      code: 'Código',
      type: 'Tipo',
      country: 'País',
      parent: 'Pai',
      latitude: 'Latitude',
      longitude: 'Longitude',
      addNew: 'Adicionar Novo Site',
      edit: 'Editar Site',
      delete: 'Excluir Site',
      save: 'Salvar',
      cancel: 'Cancelar',
      noSites: 'Nenhum site operacional encontrado',
      noParent: 'Sem Pai',
      parentHelp: 'Selecione um site pai se esta área está dentro de outra (ex: uma zona de ancoragem dentro de um porto)',
      coordinateHelp: 'Nota: Latitude e Longitude devem ter 6 casas decimais',
      types: {
        ANCHORED_ZONE: 'Zona de Ancoragem',
        PORT: 'Porto',
        TERMINAL: 'Terminal',
        BERTH: 'Atracadouro',
      },
      previousOpsSite: 'Site Operacional Anterior',
      nextOpsSite: 'Próximo Site Operacional',
      currentOpsSite: 'Site Operacional',
    },
    // Customers
    customers: {
      title: 'Clientes',
      subtitle: 'Cadastrar e gerenciar empresas clientes',
      addNew: 'Adicionar Novo Cliente',
      edit: 'Editar Cliente',
      save: 'Salvar',
      cancel: 'Cancelar',
      deleteConfirm: 'Tem certeza que deseja excluir este cliente?',
      noCustomers: 'Nenhum cliente encontrado',
      companyInfo: 'Informações da Empresa',
      addressInfo: 'Informações de Endereço',
      contactInfo: 'Informações de Contato',
      additionalInfo: 'Informações Adicionais',
      isForeignCompany: 'Empresa Estrangeira',
      cnpj: 'CNPJ',
      foreignRegistrationNo: 'Número de Registro (Estrangeiro)',
      foreignRegistrationPlaceholder: 'Digite o número de registro da empresa estrangeira',
      razaoSocial: 'Razão Social',
      nomeFantasia: 'Nome Fantasia',
      foreign: 'Estrangeira',
      brazilian: 'Brasileira',
      cnpjRequired: 'CNPJ é obrigatório para empresas brasileiras',
      foreignRegistrationRequired: 'Número de Registro (Estrangeiro) é obrigatório para empresas estrangeiras',
      razaoSocialRequired: 'Razão Social é obrigatória',
      email: 'E-mail',
      telefone: 'Telefone',
      celular: 'Celular',
      endereco: 'Endereço',
      complemento: 'Complemento',
      bairro: 'Bairro',
      cidade: 'Cidade',
      estado: 'Estado',
      cep: 'CEP',
      pais: 'País',
      contatoNome: 'Nome do Contato',
      contatoCargo: 'Cargo do Contato',
      contatoEmail: 'E-mail do Contato',
      contatoTelefone: 'Telefone do Contato',
      inscricaoEstadual: 'Inscrição Estadual (IE)',
      inscricaoMunicipal: 'Inscrição Municipal (IM)',
      website: 'Website',
      observacoes: 'Observações',
      selectState: 'Selecione o Estado',
    },
  },
};

// Normalize locale (en-US -> en-US, pt-BR -> pt-BR)
function normalizeLocale(locale) {
  if (!locale) return 'en-US';
  if (locale.startsWith('pt')) return 'pt-BR';
  if (locale.startsWith('en')) return 'en-US';
  return 'en-US';
}

let currentLocale = normalizeLocale(localStorage.getItem('locale') || 'en-US');
let localeListeners = [];

export function setLocale(locale) {
  const normalized = normalizeLocale(locale);
  if (currentLocale !== normalized) {
    currentLocale = normalized;
    localStorage.setItem('locale', normalized);
    // Notify all listeners
    localeListeners.forEach(listener => listener(normalized));
  }
}

export function getLocale() {
  return currentLocale;
}

export function subscribeToLocale(callback) {
  localeListeners.push(callback);
  return () => {
    localeListeners = localeListeners.filter(l => l !== callback);
  };
}

export function t(key, params = {}) {
  const locale = getLocale();
  const keys = key.split('.');
  let value = translations[locale] || translations['en-US'];

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      // Fallback to English
      value = translations['en-US'];
      for (const k2 of keys) {
        value = value?.[k2];
      }
      break;
    }
  }

  if (typeof value === 'string' && params) {
    return value.replace(/\{\{(\w+)\}\}/g, (match, key) => params[key] || match);
  }

  return value || key;
}

export function getJurisdictionConfig(jurisdictionKey) {
  const locale = getLocale();
  return translations[locale]?.jurisdiction?.[jurisdictionKey] ||
    translations['en-US']?.jurisdiction?.[jurisdictionKey] ||
    translations['en-US']?.jurisdiction?.GENERIC;
}
