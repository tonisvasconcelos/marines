import express from 'express';
import { 
  getMockCustomers, 
  createMockCustomer, 
  updateMockCustomer, 
  deleteMockCustomer,
  getVesselsByCustomer,
  createVesselCustomerAssociation,
  deleteVesselCustomerAssociation,
} from '../data/mockData.js';

const router = express.Router();

// GET /api/customers - List all customers for tenant
router.get('/', (req, res) => {
  const { tenantId } = req;
  const customers = getMockCustomers(tenantId);
  res.json(customers);
});

// GET /api/customers/:id - Get single customer
router.get('/:id', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const customers = getMockCustomers(tenantId);
  const customer = customers.find((c) => c.id === id);
  
  if (!customer) {
    return res.status(404).json({ message: 'Customer not found' });
  }
  
  res.json(customer);
});

// POST /api/customers - Create new customer
router.post('/', (req, res) => {
  const { tenantId } = req;
  const {
    isForeignCompany,
    cnpj,
    foreignRegistrationNo,
    razaoSocial,
    nomeFantasia,
    email,
    telefone,
    celular,
    endereco,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
    pais,
    contatoNome,
    contatoCargo,
    contatoEmail,
    contatoTelefone,
    inscricaoEstadual,
    inscricaoMunicipal,
    website,
    observacoes,
  } = req.body;
  
  if (!razaoSocial) {
    return res.status(400).json({ message: 'Razão Social is required' });
  }
  
  // CNPJ is required only for Brazilian companies
  if (!isForeignCompany && !cnpj) {
    return res.status(400).json({ message: 'CNPJ is required for Brazilian companies' });
  }
  
  // Foreign registration number is required for foreign companies
  if (isForeignCompany && !foreignRegistrationNo) {
    return res.status(400).json({ message: 'Company Registration No. (Foreign) is required for foreign companies' });
  }
  
  const newCustomer = createMockCustomer(tenantId, {
    isForeignCompany: isForeignCompany || false,
    cnpj,
    foreignRegistrationNo,
    razaoSocial,
    nomeFantasia,
    email,
    telefone,
    celular,
    endereco,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
    pais,
    contatoNome,
    contatoCargo,
    contatoEmail,
    contatoTelefone,
    inscricaoEstadual,
    inscricaoMunicipal,
    website,
    observacoes,
  });
  
  res.status(201).json(newCustomer);
});

// PUT /api/customers/:id - Update customer
router.put('/:id', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const {
    isForeignCompany,
    cnpj,
    foreignRegistrationNo,
    razaoSocial,
    nomeFantasia,
    email,
    telefone,
    celular,
    endereco,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
    pais,
    contatoNome,
    contatoCargo,
    contatoEmail,
    contatoTelefone,
    inscricaoEstadual,
    inscricaoMunicipal,
    website,
    observacoes,
  } = req.body;
  
  // Validation
  if (!razaoSocial) {
    return res.status(400).json({ message: 'Razão Social is required' });
  }
  
  // CNPJ is required only for Brazilian companies
  if (!isForeignCompany && !cnpj) {
    return res.status(400).json({ message: 'CNPJ is required for Brazilian companies' });
  }
  
  // Foreign registration number is required for foreign companies
  if (isForeignCompany && !foreignRegistrationNo) {
    return res.status(400).json({ message: 'Company Registration No. (Foreign) is required for foreign companies' });
  }
  
  const updated = updateMockCustomer(tenantId, id, {
    isForeignCompany: isForeignCompany || false,
    cnpj,
    foreignRegistrationNo,
    razaoSocial,
    nomeFantasia,
    email,
    telefone,
    celular,
    endereco,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
    pais,
    contatoNome,
    contatoCargo,
    contatoEmail,
    contatoTelefone,
    inscricaoEstadual,
    inscricaoMunicipal,
    website,
    observacoes,
  });
  
  if (!updated) {
    return res.status(404).json({ message: 'Customer not found' });
  }
  
  res.json(updated);
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  const deleted = deleteMockCustomer(tenantId, id);
  
  if (!deleted) {
    return res.status(404).json({ message: 'Customer not found' });
  }
  
  res.json({ message: 'Customer deleted' });
});

// GET /api/customers/:id/vessels - Get vessels associated with customer
router.get('/:id/vessels', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  const vessels = getVesselsByCustomer(tenantId, id);
  res.json(vessels);
});

// POST /api/customers/:id/vessels - Associate vessel with customer
router.post('/:id/vessels', (req, res) => {
  const { tenantId } = req;
  const { id: customerId } = req.params;
  const { vesselId } = req.body;
  
  if (!vesselId) {
    return res.status(400).json({ message: 'vesselId is required' });
  }
  
  const association = createVesselCustomerAssociation(tenantId, vesselId, customerId);
  
  if (!association) {
    return res.status(400).json({ message: 'Association already exists' });
  }
  
  res.status(201).json(association);
});

// DELETE /api/customers/:id/vessels/:vesselId - Remove vessel association
router.delete('/:id/vessels/:vesselId', (req, res) => {
  const { tenantId } = req;
  const { id: customerId, vesselId } = req.params;
  
  const deleted = deleteVesselCustomerAssociation(tenantId, vesselId, customerId);
  
  if (!deleted) {
    return res.status(404).json({ message: 'Association not found' });
  }
  
  res.json({ message: 'Association removed' });
});

export default router;

