import express from 'express';
import { getMockAisPosition, getMockAisTrack } from '../data/mockData.js';

const router = express.Router();

router.get('/vessels/:vesselId/last-position', (req, res) => {
  const { tenantId } = req;
  const { vesselId } = req.params;
  
  // In production, verify vessel belongs to tenant
  const position = getMockAisPosition(vesselId);
  
  if (position.tenantId !== tenantId) {
    return res.status(404).json({ message: 'Vessel not found' });
  }
  
  res.json(position);
});

router.get('/vessels/:vesselId/track', (req, res) => {
  const { tenantId } = req;
  const { vesselId } = req.params;
  const hours = parseInt(req.query.hours) || 24;
  
  // In production, verify vessel belongs to tenant
  const track = getMockAisTrack(vesselId, hours);
  
  if (track.length > 0 && track[0].tenantId !== tenantId) {
    return res.status(404).json({ message: 'Vessel not found' });
  }
  
  res.json(track);
});

export default router;
