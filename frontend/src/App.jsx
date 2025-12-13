import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './modules/auth/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import DashboardPage from './modules/dashboardV2/DashboardPage';
import PortCallsList from './pages/PortCalls/PortCallsList';
import PortCallDetail from './pages/PortCalls/PortCallDetail';
import FleetMap from './pages/FleetMap';
import VesselsList from './pages/Vessels/VesselsList';
import VesselDetail from './pages/Vessels/VesselDetail';
import People from './pages/People';
import Security from './pages/Security';
import Fees from './pages/Fees';
import SettingsTenant from './pages/Settings/Tenant';
import SettingsUsers from './pages/Settings/Users';
import SettingsAis from './pages/Settings/Ais';
import OpsSites from './pages/OpsSites';
import PortCallsFromAIS from './pages/OpsSites/PortCallsFromAIS';
import Customers from './pages/Customers';
import Agents from './pages/Agents';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/port-calls" element={<PortCallsList />} />
                <Route path="/port-calls/:id" element={<PortCallDetail />} />
                <Route path="/fleet-map" element={<FleetMap />} />
                <Route path="/vessels" element={<VesselsList />} />
                <Route path="/vessels/:id" element={<VesselDetail />} />
                <Route path="/people" element={<People />} />
                <Route path="/security" element={<Security />} />
                <Route path="/fees" element={<Fees />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/ops-sites" element={<OpsSites />} />
                <Route path="/ops-sites/:id/port-calls" element={<PortCallsFromAIS />} />
                <Route path="/settings/tenant" element={<SettingsTenant />} />
                <Route path="/settings/users" element={<SettingsUsers />} />
                <Route path="/settings/ais" element={<SettingsAis />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;

