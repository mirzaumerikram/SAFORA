import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Rides from './pages/Rides';
import Drivers from './pages/Drivers';
import Passengers from './pages/Passengers';
import SosAlerts from './pages/SosAlerts';
import SafetyReports from './pages/SafetyReports';
import LiveMap from './pages/LiveMap';

const ProtectedRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:14,color:'#888' }}>Loading...</div>;
  return admin ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { admin } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={admin ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="live-map" element={<LiveMap />} />
        <Route path="rides" element={<Rides />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="passengers" element={<Passengers />} />
        <Route path="sos-alerts" element={<SosAlerts />} />
        <Route path="safety-reports" element={<SafetyReports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
