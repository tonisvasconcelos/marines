import express from 'express';
import crypto from 'crypto';

const router = express.Router();
const invoices = [];

router.get('/', (req, res) => {
  const { tenantId } = req;
  const { status } = req.query;
  let results = invoices.filter((inv) => inv.tenantId === tenantId);
  if (status) {
    results = results.filter((inv) => inv.status === status);
  }
  res.json(results);
});

router.post('/', (req, res) => {
  const { tenantId, user } = req;
  const { portCallId, customerId, totalAmount = 0, currency = 'BRL' } = req.body || {};
  const invoice = {
    id: `inv-${crypto.randomUUID()}`,
    tenantId,
    portCallId: portCallId || null,
    customerId: customerId || null,
    totalAmount,
    currency,
    status: 'DRAFT',
    issuedAt: null,
    createdAt: new Date().toISOString(),
    createdBy: user?.userId,
  };
  invoices.push(invoice);
  res.status(201).json(invoice);
});

router.post('/:id/issue', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const invoice = invoices.find((inv) => inv.id === id && inv.tenantId === tenantId);
  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }
  invoice.status = 'ISSUED';
  invoice.issuedAt = new Date().toISOString();
  // PDF generation would be offloaded to a worker in production
  invoice.pdfJob = { status: 'QUEUED' };
  res.json(invoice);
});

export default router;

