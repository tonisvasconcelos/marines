import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../../utils/useI18n';
import { api } from '../../utils/api';
import Card from '../../components/ui/Card';
import styles from './PortCallsFromAIS.module.css';

function PortCallsFromAIS() {
  const { id: siteId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('estimates'); // 'estimates', 'calls', 'in-port'

  // Fetch ops site details
  const { data: site, isLoading: siteLoading } = useQuery({
    queryKey: ['opsSite', siteId],
    queryFn: () => api.get(`/ops-sites/${siteId}`),
    enabled: !!siteId,
  });

  // Fetch port estimates (last 24h)
  const { data: estimates, isLoading: estimatesLoading } = useQuery({
    queryKey: ['opsSite', siteId, 'port-estimates'],
    queryFn: () => api.get(`/ops-sites/${siteId}/port-estimates`),
    enabled: !!siteId && activeTab === 'estimates',
    staleTime: 60000, // 1 minute
  });

  // Fetch port calls
  const { data: portCalls, isLoading: callsLoading } = useQuery({
    queryKey: ['opsSite', siteId, 'port-calls-ais'],
    queryFn: () => {
      const fromdate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Last 24h
      return api.get(`/ops-sites/${siteId}/port-calls-ais?fromdate=${fromdate}&days=1`);
    },
    enabled: !!siteId && activeTab === 'calls',
    staleTime: 60000, // 1 minute
  });

  // Fetch vessels in port
  const { data: vesselsInPort, isLoading: inPortLoading } = useQuery({
    queryKey: ['opsSite', siteId, 'vessels-in-port'],
    queryFn: () => api.get(`/ops-sites/${siteId}/vessels-in-port`),
    enabled: !!siteId && activeTab === 'in-port',
    staleTime: 60000, // 1 minute
  });

  // Fetch tenant vessels to match MMSI/IMO
  const { data: tenantVessels } = useQuery({
    queryKey: ['vessels'],
    queryFn: () => api.get('/vessels'),
  });

  // Create port call mutation
  const createPortCallMutation = useMutation({
    mutationFn: async (aisData) => {
      // Find matching vessel by MMSI or IMO
      // Clean IMO prefix if present
      const cleanAisImo = aisData.imo ? String(aisData.imo).replace(/^IMO/i, '').trim() : null;
      
      const matchingVessel = tenantVessels?.find(v => {
        // Match by MMSI
        if (aisData.mmsi && v.mmsi && String(v.mmsi) === String(aisData.mmsi)) {
          return true;
        }
        // Match by IMO (clean both sides)
        if (cleanAisImo && v.imo) {
          const cleanVesselImo = String(v.imo).replace(/^IMO/i, '').trim();
          if (cleanVesselImo === cleanAisImo) {
            return true;
          }
        }
        return false;
      });

      if (!matchingVessel) {
        throw new Error('No matching vessel found in tenant. Please create the vessel first with the same MMSI or IMO.');
      }

      // Prepare port call data
      const portCallData = {
        vesselId: matchingVessel.id,
        portId: siteId,
        eta: aisData.etaUtc || aisData.eta || aisData.arrival,
        etd: aisData.etd || aisData.departure,
        status: 'PLANNED',
      };

      return api.post('/port-calls', portCallData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['portCalls']);
      queryClient.invalidateQueries(['opsSite', siteId]);
      alert('Port call created successfully!');
      navigate(`/port-calls/${data.id}`);
    },
    onError: (error) => {
      alert(`Failed to create port call: ${error.message}`);
    },
  });

  const handleCreatePortCall = (aisData) => {
    if (window.confirm(`Create port call for ${aisData.vesselName || aisData.mmsi || aisData.imo}?`)) {
      createPortCallMutation.mutate(aisData);
    }
  };

  if (siteLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!site) {
    return <div className={styles.error}>Ops site not found</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/ops-sites')}>
          ← Back to Ops Sites
        </button>
        <div>
          <h1>Port Calls - {site.name}</h1>
          <p>View AIS data for vessels calling at this port (tenant vessels only)</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'estimates' ? styles.active : ''}`}
          onClick={() => setActiveTab('estimates')}
        >
          Expected Arrivals (Last 24h)
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'calls' ? styles.active : ''}`}
          onClick={() => setActiveTab('calls')}
        >
          Port Calls
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'in-port' ? styles.active : ''}`}
          onClick={() => setActiveTab('in-port')}
        >
          Vessels In Port
        </button>
      </div>

      {/* Estimates Tab */}
      {activeTab === 'estimates' && (
        <Card>
          <h2>Expected Arrivals (Last 24h)</h2>
          {estimatesLoading ? (
            <div className={styles.loading}>Loading estimates...</div>
          ) : estimates && estimates.length > 0 ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Vessel Name</th>
                    <th>MMSI</th>
                    <th>IMO</th>
                    <th>Type</th>
                    <th>ETA (UTC)</th>
                    <th>ETA (Local)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map((est, idx) => (
                    <tr key={idx}>
                      <td>{est.vesselName || '-'}</td>
                      <td>{est.mmsi || '-'}</td>
                      <td>{est.imo || '-'}</td>
                      <td>{est.vesselType || '-'}</td>
                      <td>{est.etaUtc ? new Date(est.etaUtc).toLocaleString() : '-'}</td>
                      <td>{est.etaLocal ? new Date(est.etaLocal).toLocaleString() : '-'}</td>
                      <td>
                        <button
                          className={styles.createButton}
                          onClick={() => handleCreatePortCall(est)}
                          disabled={createPortCallMutation.isPending}
                        >
                          Create Portcall
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.empty}>No expected arrivals found for tenant vessels</div>
          )}
        </Card>
      )}

      {/* Port Calls Tab */}
      {activeTab === 'calls' && (
        <Card>
          <h2>Port Calls (Last 24h)</h2>
          {callsLoading ? (
            <div className={styles.loading}>Loading port calls...</div>
          ) : portCalls && portCalls.length > 0 ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Vessel Name</th>
                    <th>MMSI</th>
                    <th>IMO</th>
                    <th>Port</th>
                    <th>Arrival</th>
                    <th>Departure</th>
                    <th>Type</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {portCalls.map((call, idx) => (
                    <tr key={idx}>
                      <td>{call.vesselName || '-'}</td>
                      <td>{call.mmsi || '-'}</td>
                      <td>{call.imo || '-'}</td>
                      <td>{call.portName || call.portId || '-'}</td>
                      <td>{call.arrival ? new Date(call.arrival).toLocaleString() : '-'}</td>
                      <td>{call.departure ? new Date(call.departure).toLocaleString() : '-'}</td>
                      <td>{call.type === 1 ? 'Arrival' : call.type === 2 ? 'Departure' : 'All'}</td>
                      <td>
                        <button
                          className={styles.createButton}
                          onClick={() => handleCreatePortCall(call)}
                          disabled={createPortCallMutation.isPending}
                        >
                          Create Portcall
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.empty}>No port calls found for tenant vessels</div>
          )}
        </Card>
      )}

      {/* Vessels In Port Tab */}
      {activeTab === 'in-port' && (
        <Card>
          <h2>Vessels Currently In Port</h2>
          {inPortLoading ? (
            <div className={styles.loading}>Loading vessels in port...</div>
          ) : vesselsInPort && vesselsInPort.length > 0 ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Vessel Name</th>
                    <th>MMSI</th>
                    <th>IMO</th>
                    <th>Type</th>
                    <th>Arrival</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vesselsInPort.map((vessel, idx) => (
                    <tr key={idx}>
                      <td>{vessel.vesselName || '-'}</td>
                      <td>{vessel.mmsi || '-'}</td>
                      <td>{vessel.imo || '-'}</td>
                      <td>{vessel.vesselType || '-'}</td>
                      <td>{vessel.arrival ? new Date(vessel.arrival).toLocaleString() : '-'}</td>
                      <td>
                        <button
                          className={styles.createButton}
                          onClick={() => handleCreatePortCall(vessel)}
                          disabled={createPortCallMutation.isPending}
                        >
                          Create Portcall
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.empty}>No vessels currently in port for tenant vessels</div>
          )}
        </Card>
      )}
    </div>
  );
}

export default PortCallsFromAIS;

