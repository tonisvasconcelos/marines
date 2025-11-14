import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '../../utils/api';
import Card from '../ui/Card';
import MapView from '../ais/MapView';
import styles from './VesselForm.module.css';

function VesselForm({ onClose, vessel = null }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: vessel?.name || '',
    imo: vessel?.imo || '',
    mmsi: vessel?.mmsi || '',
    callSign: vessel?.callSign || '',
    flag: vessel?.flag || '',
  });

  // Extract IMO number for position lookup (remove 'IMO' prefix if present)
  const imoNumber = formData.imo ? formData.imo.replace(/^IMO/i, '').trim() : '';
  const hasValidImo = !!(imoNumber && imoNumber.length >= 7);
  const hasValidMmsi = !!(formData.mmsi && formData.mmsi.length >= 9);
  const shouldFetchPosition = hasValidImo || hasValidMmsi;
  
  // Fetch AIS position preview when IMO or MMSI is provided
  const { data: position, isLoading: positionLoading, error: positionError } = useQuery({
    queryKey: ['vessel-position-preview', imoNumber || formData.mmsi],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (imoNumber) params.append('imo', imoNumber);
      if (formData.mmsi) params.append('mmsi', formData.mmsi);
      
      const data = await api.get(`/vessels/preview-position?${params.toString()}`);
      // Normalize position data to handle case variations
      return {
        ...data,
        lat: data.lat || data.Lat || data.latitude || data.Latitude,
        lon: data.lon || data.Lon || data.longitude || data.Longitude,
      };
    },
    enabled: shouldFetchPosition, // Always a boolean
    retry: 1,
    retryDelay: 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/vessels', data),
    onSuccess: (newVessel) => {
      queryClient.invalidateQueries(['vessels']);
      // If vessel was created with IMO/MMSI, we could fetch position here
      onClose();
    },
    onError: (error) => {
      alert('Failed to create vessel: ' + error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Clean IMO - remove 'IMO' prefix if present
    const cleanImo = formData.imo.replace(/^IMO/i, '').trim();
    
    createMutation.mutate({
      ...formData,
      imo: cleanImo ? `IMO${cleanImo}` : '',
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <Card className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>New Vessel</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Vessel Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., STARNAV ANDROMEDA"
              required
            />
          </div>
          <div className={styles.field}>
            <label>IMO Number</label>
            <input
              type="text"
              value={formData.imo}
              onChange={(e) => setFormData({ ...formData, imo: e.target.value })}
              placeholder="e.g., 9715737 or IMO9715737"
            />
            <small className={styles.helpText}>
              Enter IMO number (with or without 'IMO' prefix). Used to fetch AIS position.
            </small>
          </div>
          <div className={styles.field}>
            <label>MMSI</label>
            <input
              type="text"
              value={formData.mmsi}
              onChange={(e) => setFormData({ ...formData, mmsi: e.target.value })}
              placeholder="e.g., 123456789"
            />
          </div>
          <div className={styles.field}>
            <label>Call Sign</label>
            <input
              type="text"
              value={formData.callSign}
              onChange={(e) => setFormData({ ...formData, callSign: e.target.value })}
              placeholder="e.g., ABCD"
            />
          </div>
          <div className={styles.field}>
            <label>Flag (Country Code)</label>
            <input
              type="text"
              value={formData.flag}
              onChange={(e) => setFormData({ ...formData, flag: e.target.value.toUpperCase() })}
              placeholder="e.g., BR, US, PA"
              maxLength={2}
            />
          </div>

          {/* AIS Position Map Preview */}
          {((imoNumber && imoNumber.length > 0) || (formData.mmsi && formData.mmsi.length > 0)) && (
            <div className={styles.field}>
              <label>Vessel Position (AIS)</label>
              {positionLoading ? (
                <div className={styles.loading}>Loading position...</div>
              ) : positionError ? (
                <div className={styles.error}>
                  Unable to fetch position. {positionError.message || 'Please check IMO/MMSI and AIS configuration.'}
                </div>
              ) : position && position.lat && position.lon ? (
                <div className={styles.mapPreview}>
                  <MapView
                    position={position}
                    vesselName={formData.name || 'Vessel'}
                  />
                  <div className={styles.positionInfo}>
                    <small>
                      <strong>Lat:</strong> {position.lat.toFixed(6)}, <strong>Lon:</strong> {position.lon.toFixed(6)}
                      {position.sog && ` | Speed: ${position.sog.toFixed(1)} kn`}
                      {position.cog && ` | Course: ${position.cog.toFixed(0)}°`}
                    </small>
                  </div>
                </div>
              ) : hasIdentifier ? (
                <div className={styles.info}>
                  <small>Enter a valid IMO (7 digits) or MMSI (9 digits) to see vessel position on map.</small>
                </div>
              ) : null}
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Vessel'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default VesselForm;

