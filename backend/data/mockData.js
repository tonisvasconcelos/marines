// Mock data store - in production, replace with PostgreSQL queries

let mockPortCalls = [];
let mockVessels = [];
let mockVesselsInitialized = false; // Track if default vessels have been initialized
let mockAisPositions = {};
let mockPositionHistory = []; // Array of position records: { id, vesselId, tenantId, lat, lon, timestamp, sog, cog, heading, navStatus, source }
let mockOpsSites = [];
let mockCustomers = [];
let mockVesselCustomerAssociations = []; // Array of { vesselId, customerId, tenantId }
let mockAgents = [];
let mockTeams = [];
let mockAgentVesselAssociations = []; // Array of { agentId, vesselId, tenantId }
let mockAgentCustomerAssociations = []; // Array of { agentId, customerId, tenantId }
let mockAgentPortCallAssociations = []; // Array of { agentId, portCallId, tenantId }

export function getMockUsers() {
  return [
    {
      id: 'user-1',
      email: 'demo@marines.app',
      passwordHash: '$2a$10$xtj6prUOgO50XM8pVpqYOO2cnm425RTv0fP8eErZu5AcDd1DISzaW', // bcrypt hash for demo123
      name: 'Demo User',
      tenantId: 'tenant-1',
      role: 'ADMIN',
      tenant: {
        id: 'tenant-1',
        name: 'Demo Shipping Agency',
        slug: 'demo',
        defaultCountryCode: 'BR',
        defaultLocale: 'pt-BR',
      },
    },
  ];
}

export function getMockVessels(tenantId) {
  // Only initialize default vessels once, on first call
  // After that, if vessels are deleted, don't re-initialize them
  if (!mockVesselsInitialized && mockVessels.length === 0) {
    mockVessels = [
      {
        id: 'vessel-1',
        tenantId: 'tenant-1',
        imo: 'IMO1234567',
        mmsi: '123456789',
        callSign: 'ABCD',
        name: 'MV Atlantic Star',
        flag: 'BR',
      },
      {
        id: 'vessel-2',
        tenantId: 'tenant-1',
        imo: 'IMO7654321',
        mmsi: '987654321',
        callSign: 'EFGH',
        name: 'MV Pacific Voyager',
        flag: 'US',
      },
    ];
    mockVesselsInitialized = true;
  }
  return mockVessels.filter((v) => v.tenantId === tenantId);
}

export function createMockVessel(tenantId, data) {
  const newVessel = {
    id: `vessel-${Date.now()}`,
    tenantId,
    name: data.name || '',
    imo: data.imo || '',
    mmsi: data.mmsi || '',
    callSign: data.callSign || '',
    flag: data.flag || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockVessels.push(newVessel);
  return newVessel;
}

/**
 * Delete a vessel
 */
export function deleteMockVessel(vesselId, tenantId) {
  const index = mockVessels.findIndex(
    (v) => v.id === vesselId && v.tenantId === tenantId
  );
  
  if (index === -1) {
    return false;
  }
  
  mockVessels.splice(index, 1);
  
  // Also clean up related associations
  // Remove vessel-customer associations
  mockVesselCustomerAssociations = mockVesselCustomerAssociations.filter(
    (a) => a.vesselId !== vesselId
  );
  
  // Remove agent-vessel associations
  mockAgentVesselAssociations = mockAgentVesselAssociations.filter(
    (a) => a.vesselId !== vesselId
  );
  
  return true;
}

export function getMockPorts() {
  return [
    {
      id: 'port-1',
      unlocode: 'BRRIO',
      name: 'Rio de Janeiro',
      countryCode: 'BR',
      coordinates: { lat: -22.9068, lon: -43.1729 },
    },
    {
      id: 'port-2',
      unlocode: 'BRSPS',
      name: 'Santos',
      countryCode: 'BR',
      coordinates: { lat: -23.9608, lon: -46.3336 },
    },
    {
      id: 'port-3',
      unlocode: 'USNYC',
      name: 'New York',
      countryCode: 'US',
      coordinates: { lat: 40.7128, lon: -74.006 },
    },
  ];
}

export function getMockPortCalls(tenantId) {
  if (mockPortCalls.length === 0) {
    const vessels = getMockVessels('tenant-1');
    const ports = getMockPorts();
    const now = new Date();

    mockPortCalls = [
      {
        id: 'pc-1',
        tenantId: 'tenant-1',
        vesselId: vessels[0].id,
        portId: ports[0].id,
        countryCode: 'BR',
        eta: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        etd: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'IN_PROGRESS',
        localReferenceType: 'BR_DUV',
        localReferenceNumber: 'DUV-2024-001',
        vessel: vessels[0],
        port: ports[0],
        blCount: 15,
        peopleCount: 25,
        pendingIssues: 2,
      },
      {
        id: 'pc-2',
        tenantId: 'tenant-1',
        vesselId: vessels[1].id,
        portId: ports[1].id,
        countryCode: 'BR',
        eta: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        etd: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PLANNED',
        localReferenceType: 'BR_DUV',
        localReferenceNumber: 'DUV-2024-002',
        vessel: vessels[1],
        port: ports[1],
        blCount: 8,
        peopleCount: 18,
        pendingIssues: 0,
      },
      {
        id: 'pc-3',
        tenantId: 'tenant-1',
        vesselId: vessels[0].id,
        portId: ports[2].id,
        countryCode: 'US',
        eta: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        etd: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'COMPLETED',
        localReferenceType: 'GENERIC',
        localReferenceNumber: 'PC-2024-003',
        vessel: vessels[0],
        port: ports[2],
        blCount: 22,
        peopleCount: 30,
        pendingIssues: 0,
      },
    ];
  }
  return mockPortCalls.filter((pc) => pc.tenantId === tenantId);
}

/**
 * Generate a position in maritime waters (not on land)
 * For Rio de Janeiro area, ensures positions are in Guanabara Bay or offshore
 */
function generateMaritimePosition(baseLat = -22.9068, baseLon = -43.1729) {
  // Define safe maritime areas (water only) around Rio de Janeiro
  // Guanabara Bay and offshore areas
  const maritimeAreas = [
    // Guanabara Bay - inner bay
    { lat: -22.88, lon: -43.15, radius: 0.08 },
    // Guanabara Bay - central
    { lat: -22.90, lon: -43.12, radius: 0.06 },
    // Guanabara Bay - entrance
    { lat: -22.92, lon: -43.10, radius: 0.05 },
    // Offshore - south of Rio
    { lat: -23.05, lon: -43.20, radius: 0.10 },
    // Offshore - east of Niterói
    { lat: -22.95, lon: -43.00, radius: 0.12 },
  ];
  
  // Randomly select a maritime area
  const area = maritimeAreas[Math.floor(Math.random() * maritimeAreas.length)];
  
  // Generate position within the selected area (ensuring it's in water)
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * area.radius;
  
  const lat = area.lat + (distance * Math.cos(angle) * 0.5); // Smaller variation in lat
  const lon = area.lon + (distance * Math.sin(angle));
  
  return { lat, lon };
}

export function getMockAisPosition(vesselId) {
  // Only use mock data in development/testing environments
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[MockData] Attempted to use mock AIS position in production for vessel ${vesselId}. This should not happen.`);
    return null;
  }
  
  // Always regenerate to ensure positions are in maritime waters
  // This ensures vessels are never plotted on land
  const maritimePos = generateMaritimePosition();
  
  mockAisPositions[vesselId] = {
    id: `ais-${vesselId}`,
    tenantId: 'tenant-1',
    vesselId,
    timestamp: new Date().toISOString(),
    lat: maritimePos.lat,
    lon: maritimePos.lon,
    sog: 12.5 + Math.random() * 5,
    cog: Math.random() * 360,
    heading: Math.random() * 360,
    navStatus: 'under way',
    source: 'mock',
  };
  
  return mockAisPositions[vesselId];
}

export function getMockAisTrack(vesselId, hours = 24) {
  const positions = [];
  const now = Date.now();
  const interval = (hours * 60 * 60 * 1000) / 20; // 20 points

  // Start from a maritime position
  let currentPos = generateMaritimePosition();
  
  for (let i = 0; i < 20; i++) {
    // Move position slightly (simulating vessel movement) but keep it in water
    const course = Math.random() * 360;
    const speed = 10 + Math.random() * 8; // knots
    const distance = (speed * interval) / (1000 * 60 * 60); // Convert to degrees (approx)
    
    // Move in the direction of course, but keep within maritime bounds
    const latOffset = (distance * Math.cos(course * Math.PI / 180)) * 0.01;
    const lonOffset = (distance * Math.sin(course * Math.PI / 180)) * 0.01;
    
    currentPos = {
      lat: Math.max(-23.2, Math.min(-22.7, currentPos.lat + latOffset)),
      lon: Math.max(-43.4, Math.min(-42.8, currentPos.lon + lonOffset)),
    };
    
    // Ensure position is still in maritime area
    if (i % 5 === 0) {
      // Every 5th point, regenerate from a maritime area to ensure we stay in water
      currentPos = generateMaritimePosition();
    }
    
    positions.push({
      id: `track-${vesselId}-${i}`,
      tenantId: 'tenant-1',
      vesselId,
      timestamp: new Date(now - (20 - i) * interval).toISOString(),
      lat: currentPos.lat,
      lon: currentPos.lon,
      sog: speed,
      cog: course,
      navStatus: 'under way',
      source: 'mock',
    });
  }
  return positions;
}

/**
 * Store a position record in history
 */
export function storePositionHistory(vesselId, tenantId, positionData) {
  const positionRecord = {
    id: `pos-${vesselId}-${Date.now()}`,
    vesselId,
    tenantId,
    lat: positionData.lat || positionData.Lat || positionData.latitude,
    lon: positionData.lon || positionData.Lon || positionData.longitude,
    timestamp: positionData.timestamp || new Date().toISOString(),
    sog: positionData.sog || positionData.speed,
    cog: positionData.cog || positionData.course,
    heading: positionData.heading,
    navStatus: positionData.navStatus || positionData.status,
    source: positionData.source || 'ais',
  };
  
  mockPositionHistory.push(positionRecord);
  
  // Keep only last 1000 records per vessel to prevent memory issues
  const vesselPositions = mockPositionHistory.filter(p => p.vesselId === vesselId);
  if (vesselPositions.length > 1000) {
    // Remove oldest records
    const toRemove = vesselPositions.length - 1000;
    const oldestIds = vesselPositions
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(0, toRemove)
      .map(p => p.id);
    mockPositionHistory = mockPositionHistory.filter(p => !oldestIds.includes(p.id));
  }
  
  return positionRecord;
}

/**
 * Get position history for a vessel
 */
export function getPositionHistory(vesselId, tenantId, limit = 100) {
  const history = mockPositionHistory
    .filter(p => p.vesselId === vesselId && p.tenantId === tenantId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Newest first
    .slice(0, limit);
  
  return history;
}

export function getMockOpsSites(tenantId) {
  if (mockOpsSites.length === 0) {
    // Initialize with some sample ops sites based on real data sources
    mockOpsSites = [
      {
        id: 'ops-1',
        tenantId: 'tenant-1',
        name: 'Rio de Janeiro Port',
        code: 'BRRIO',
        type: 'PORT',
        country: 'BR',
        latitude: -22.9068,
        longitude: -43.1729,
      },
      {
        id: 'ops-2',
        tenantId: 'tenant-1',
        name: 'Santos Port',
        code: 'BRSPS',
        type: 'PORT',
        country: 'BR',
        latitude: -23.9608,
        longitude: -46.3336,
      },
      {
        id: 'ops-3',
        tenantId: 'tenant-1',
        name: 'Terminal 1 - Rio',
        code: 'BRRIO-T1',
        type: 'TERMINAL',
        country: 'BR',
        latitude: -22.9100,
        longitude: -43.1750,
      },
      {
        id: 'ops-4',
        tenantId: 'tenant-1',
        name: 'Berth 5 - Santos',
        code: 'BRSPS-B5',
        type: 'BERTH',
        country: 'BR',
        latitude: -23.9620,
        longitude: -46.3350,
      },
      {
        id: 'ops-5',
        tenantId: 'tenant-1',
        name: 'Anchored Zone A - Rio',
        code: 'BRRIO-ANCH-A',
        type: 'ANCHORED_ZONE',
        country: 'BR',
        latitude: -22.9000,
        longitude: -43.1700,
        parentCode: 'BRRIO', // Parent is Rio de Janeiro Port
      },
      {
        id: 'ops-6',
        tenantId: 'tenant-1',
        name: 'Anchored Zone A1',
        code: 'BRRIO-A1',
        type: 'ANCHORED_ZONE',
        country: 'BR',
        latitude: -22.881781,
        longitude: -43.152963,
        parentCode: 'BRRIO', // Parent is Rio de Janeiro Port
      },
    ];
  }
  return mockOpsSites.filter((s) => s.tenantId === tenantId);
}

export function createMockOpsSite(tenantId, data) {
  const newSite = {
    id: `ops-${Date.now()}`,
    tenantId,
    ...data,
    polygon: data.polygon || null, // Store polygon coordinates if provided
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockOpsSites.push(newSite);
  return newSite;
}

export function updateMockOpsSite(tenantId, id, data) {
  const site = mockOpsSites.find((s) => s.id === id && s.tenantId === tenantId);
  if (!site) return null;
  
  Object.assign(site, data, {
    updatedAt: new Date().toISOString(),
  });
  
  return site;
}

export function deleteMockOpsSite(tenantId, id) {
  const index = mockOpsSites.findIndex((s) => s.id === id && s.tenantId === tenantId);
  if (index === -1) return false;
  
  mockOpsSites.splice(index, 1);
  return true;
}

// Customers (Brazilian company information)
export function getMockCustomers(tenantId) {
  if (mockCustomers.length === 0) {
    mockCustomers = [
      {
        id: 'customer-1',
        tenantId: 'tenant-1',
        isForeignCompany: false,
        cnpj: '12.345.678/0001-90',
        foreignRegistrationNo: '',
        razaoSocial: 'Empresa de Navegação Exemplo Ltda',
        nomeFantasia: 'Navegação Exemplo',
        email: 'contato@navegacaoexemplo.com.br',
        telefone: '+55 21 1234-5678',
        celular: '+55 21 98765-4321',
        endereco: 'Rua das Embarcações, 123',
        complemento: 'Sala 456',
        bairro: 'Centro',
        cidade: 'Rio de Janeiro',
        estado: 'RJ',
        cep: '20000-000',
        pais: 'BR',
        contatoNome: 'João Silva',
        contatoCargo: 'Gerente Comercial',
        contatoEmail: 'joao.silva@navegacaoexemplo.com.br',
        contatoTelefone: '+55 21 1234-5678',
        inscricaoEstadual: '123456789',
        inscricaoMunicipal: '987654321',
        website: 'https://www.navegacaoexemplo.com.br',
        observacoes: 'Cliente preferencial',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
  return mockCustomers.filter((c) => c.tenantId === tenantId);
}

export function createMockCustomer(tenantId, data) {
  const newCustomer = {
    id: `customer-${Date.now()}`,
    tenantId,
    isForeignCompany: data.isForeignCompany || false,
    cnpj: data.cnpj || '',
    foreignRegistrationNo: data.foreignRegistrationNo || '',
    razaoSocial: data.razaoSocial || '',
    nomeFantasia: data.nomeFantasia || '',
    email: data.email || '',
    telefone: data.telefone || '',
    celular: data.celular || '',
    endereco: data.endereco || '',
    complemento: data.complemento || '',
    bairro: data.bairro || '',
    cidade: data.cidade || '',
    estado: data.estado || '',
    cep: data.cep || '',
    pais: data.pais || 'BR',
    contatoNome: data.contatoNome || '',
    contatoCargo: data.contatoCargo || '',
    contatoEmail: data.contatoEmail || '',
    contatoTelefone: data.contatoTelefone || '',
    inscricaoEstadual: data.inscricaoEstadual || '',
    inscricaoMunicipal: data.inscricaoMunicipal || '',
    website: data.website || '',
    observacoes: data.observacoes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockCustomers.push(newCustomer);
  return newCustomer;
}

export function updateMockCustomer(tenantId, id, data) {
  const customer = mockCustomers.find((c) => c.id === id && c.tenantId === tenantId);
  if (!customer) return null;
  
  Object.assign(customer, data, {
    updatedAt: new Date().toISOString(),
  });
  
  return customer;
}

export function deleteMockCustomer(tenantId, id) {
  const index = mockCustomers.findIndex((c) => c.id === id && c.tenantId === tenantId);
  if (index === -1) return false;
  
  mockCustomers.splice(index, 1);
  // Also remove all associations with this customer
  mockVesselCustomerAssociations = mockVesselCustomerAssociations.filter(
    (a) => !(a.customerId === id && a.tenantId === tenantId)
  );
  return true;
}

// Vessel-Customer Associations
export function getVesselCustomerAssociations(tenantId, vesselId = null, customerId = null) {
  return mockVesselCustomerAssociations.filter((a) => {
    if (a.tenantId !== tenantId) return false;
    if (vesselId && a.vesselId !== vesselId) return false;
    if (customerId && a.customerId !== customerId) return false;
    return true;
  });
}

export function getVesselsByCustomer(tenantId, customerId) {
  const associations = getVesselCustomerAssociations(tenantId, null, customerId);
  const vesselIds = associations.map((a) => a.vesselId);
  return mockVessels.filter((v) => v.tenantId === tenantId && vesselIds.includes(v.id));
}

export function getCustomersByVessel(tenantId, vesselId) {
  const associations = getVesselCustomerAssociations(tenantId, vesselId, null);
  const customerIds = associations.map((a) => a.customerId);
  return mockCustomers.filter((c) => c.tenantId === tenantId && customerIds.includes(c.id));
}

export function createVesselCustomerAssociation(tenantId, vesselId, customerId) {
  // Check if association already exists
  const exists = mockVesselCustomerAssociations.some(
    (a) => a.tenantId === tenantId && a.vesselId === vesselId && a.customerId === customerId
  );
  if (exists) return null;
  
  const association = {
    id: `assoc-${Date.now()}`,
    tenantId,
    vesselId,
    customerId,
    createdAt: new Date().toISOString(),
  };
  mockVesselCustomerAssociations.push(association);
  return association;
}

export function deleteVesselCustomerAssociation(tenantId, vesselId, customerId) {
  const index = mockVesselCustomerAssociations.findIndex(
    (a) => a.tenantId === tenantId && a.vesselId === vesselId && a.customerId === customerId
  );
  if (index === -1) return false;
  
  mockVesselCustomerAssociations.splice(index, 1);
  return true;
}

// Teams
export function getMockTeams(tenantId) {
  if (mockTeams.length === 0) {
    mockTeams = [
      {
        id: 'team-1',
        tenantId: 'tenant-1',
        name: 'Operations Team Alpha',
        description: 'Primary operations team for port calls',
        color: '#3B82F6',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
  return mockTeams.filter((t) => t.tenantId === tenantId);
}

export function createMockTeam(tenantId, data) {
  const newTeam = {
    id: `team-${Date.now()}`,
    tenantId,
    name: data.name || '',
    description: data.description || '',
    color: data.color || '#3B82F6',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockTeams.push(newTeam);
  return newTeam;
}

export function updateMockTeam(tenantId, id, data) {
  const team = mockTeams.find((t) => t.id === id && t.tenantId === tenantId);
  if (!team) return null;
  
  Object.assign(team, data, {
    updatedAt: new Date().toISOString(),
  });
  
  return team;
}

export function deleteMockTeam(tenantId, id) {
  const index = mockTeams.findIndex((t) => t.id === id && t.tenantId === tenantId);
  if (index === -1) return false;
  
  mockTeams.splice(index, 1);
  // Remove team from all agents
  mockAgents.forEach((agent) => {
    if (agent.teamId === id) {
      agent.teamId = null;
    }
  });
  return true;
}

// Agents
export function getMockAgents(tenantId) {
  if (mockAgents.length === 0) {
    mockAgents = [
      {
        id: 'agent-1',
        tenantId: 'tenant-1',
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+55 21 1234-5678',
        role: 'Port Agent',
        teamId: 'team-1',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
  return mockAgents.filter((a) => a.tenantId === tenantId);
}

export function createMockAgent(tenantId, data) {
  const newAgent = {
    id: `agent-${Date.now()}`,
    tenantId,
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    role: data.role || '',
    teamId: data.teamId || null,
    active: data.active !== undefined ? data.active : true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockAgents.push(newAgent);
  return newAgent;
}

export function updateMockAgent(tenantId, id, data) {
  const agent = mockAgents.find((a) => a.id === id && a.tenantId === tenantId);
  if (!agent) return null;
  
  Object.assign(agent, data, {
    updatedAt: new Date().toISOString(),
  });
  
  return agent;
}

export function deleteMockAgent(tenantId, id) {
  const index = mockAgents.findIndex((a) => a.id === id && a.tenantId === tenantId);
  if (index === -1) return false;
  
  mockAgents.splice(index, 1);
  // Remove all associations
  mockAgentVesselAssociations = mockAgentVesselAssociations.filter((a) => a.agentId !== id);
  mockAgentCustomerAssociations = mockAgentCustomerAssociations.filter((a) => a.agentId !== id);
  mockAgentPortCallAssociations = mockAgentPortCallAssociations.filter((a) => a.agentId !== id);
  return true;
}

// Agent-Vessel Associations
export function getAgentsByVessel(tenantId, vesselId) {
  const associations = mockAgentVesselAssociations.filter(
    (a) => a.tenantId === tenantId && a.vesselId === vesselId
  );
  const agentIds = associations.map((a) => a.agentId);
  return mockAgents.filter((a) => a.tenantId === tenantId && agentIds.includes(a.id));
}

export function createAgentVesselAssociation(tenantId, agentId, vesselId) {
  const exists = mockAgentVesselAssociations.some(
    (a) => a.tenantId === tenantId && a.agentId === agentId && a.vesselId === vesselId
  );
  if (exists) return null;
  
  const association = {
    id: `assoc-${Date.now()}`,
    tenantId,
    agentId,
    vesselId,
    createdAt: new Date().toISOString(),
  };
  mockAgentVesselAssociations.push(association);
  return association;
}

export function deleteAgentVesselAssociation(tenantId, agentId, vesselId) {
  const index = mockAgentVesselAssociations.findIndex(
    (a) => a.tenantId === tenantId && a.agentId === agentId && a.vesselId === vesselId
  );
  if (index === -1) return false;
  
  mockAgentVesselAssociations.splice(index, 1);
  return true;
}

// Agent-Customer Associations
export function getAgentsByCustomer(tenantId, customerId) {
  const associations = mockAgentCustomerAssociations.filter(
    (a) => a.tenantId === tenantId && a.customerId === customerId
  );
  const agentIds = associations.map((a) => a.agentId);
  return mockAgents.filter((a) => a.tenantId === tenantId && agentIds.includes(a.id));
}

export function createAgentCustomerAssociation(tenantId, agentId, customerId) {
  const exists = mockAgentCustomerAssociations.some(
    (a) => a.tenantId === tenantId && a.agentId === agentId && a.customerId === customerId
  );
  if (exists) return null;
  
  const association = {
    id: `assoc-${Date.now()}`,
    tenantId,
    agentId,
    customerId,
    createdAt: new Date().toISOString(),
  };
  mockAgentCustomerAssociations.push(association);
  return association;
}

export function deleteAgentCustomerAssociation(tenantId, agentId, customerId) {
  const index = mockAgentCustomerAssociations.findIndex(
    (a) => a.tenantId === tenantId && a.agentId === agentId && a.customerId === customerId
  );
  if (index === -1) return false;
  
  mockAgentCustomerAssociations.splice(index, 1);
  return true;
}

// Agent-PortCall Associations
export function getAgentsByPortCall(tenantId, portCallId) {
  const associations = mockAgentPortCallAssociations.filter(
    (a) => a.tenantId === tenantId && a.portCallId === portCallId
  );
  const agentIds = associations.map((a) => a.agentId);
  return mockAgents.filter((a) => a.tenantId === tenantId && agentIds.includes(a.id));
}

export function createAgentPortCallAssociation(tenantId, agentId, portCallId) {
  const exists = mockAgentPortCallAssociations.some(
    (a) => a.tenantId === tenantId && a.agentId === agentId && a.portCallId === portCallId
  );
  if (exists) return null;
  
  const association = {
    id: `assoc-${Date.now()}`,
    tenantId,
    agentId,
    portCallId,
    createdAt: new Date().toISOString(),
  };
  mockAgentPortCallAssociations.push(association);
  return association;
}

export function deleteAgentPortCallAssociation(tenantId, agentId, portCallId) {
  const index = mockAgentPortCallAssociations.findIndex(
    (a) => a.tenantId === tenantId && a.agentId === agentId && a.portCallId === portCallId
  );
  if (index === -1) return false;
  
  mockAgentPortCallAssociations.splice(index, 1);
  return true;
}

