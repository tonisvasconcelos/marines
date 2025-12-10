import express from 'express';
import crypto from 'crypto';

const router = express.Router();
const purchaseOrders = [];

router.get('/', (req, res) => {
  const { tenantId } = req;
  res.json(purchaseOrders.filter((po) => po.tenantId === tenantId));
});

router.post('/', (req, res) => {
  const { tenantId } = req;
  const { supplierId, portCallId, totalAmount = 0, currency = 'BRL' } = req.body || {};
  const po = {
    id: `po-${crypto.randomUUID()}`,
    tenantId,
    supplierId: supplierId || null,
    portCallId: portCallId || null,
    totalAmount,
    currency,
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
  };
  purchaseOrders.push(po);
  res.status(201).json(po);
});

router.post('/:id/submit', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const po = purchaseOrders.find((p) => p.id === id && p.tenantId === tenantId);
  if (!po) {
    return res.status(404).json({ message: 'Purchase order not found' });
  }
  po.status = 'SUBMITTED';
  res.json(po);
});

export default router;

