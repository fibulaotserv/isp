import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetails from './pages/CustomerDetails';
import NetworkMap from './pages/NetworkMap';
import TenantManagement from './pages/TenantManagement';
import Plans from './pages/Plans';
import Financial from './pages/Financial';
import UserManagement from './pages/UserManagement';
import Inventory from './pages/Inventory';
import InventoryItemDetails from './pages/InventoryItemDetails';
import Settings from './pages/Settings';
import { useAuthStore } from './store/authStore';
import DashboardLayout from './components/DashboardLayout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <DashboardLayout>{children}</DashboardLayout> : <Navigate to="/" />;
}

function MasterRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  return isAuthenticated && user?.role === 'master' ? 
    <DashboardLayout>{children}</DashboardLayout> : 
    <Navigate to="/dashboard" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <PrivateRoute>
              <Customers />
            </PrivateRoute>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <PrivateRoute>
              <CustomerDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/network"
          element={
            <PrivateRoute>
              <NetworkMap />
            </PrivateRoute>
          }
        />
        <Route
          path="/plans"
          element={
            <PrivateRoute>
              <Plans />
            </PrivateRoute>
          }
        />
        <Route
          path="/financial"
          element={
            <PrivateRoute>
              <Financial />
            </PrivateRoute>
          }
        />
        <Route
          path="/users"
          element={
            <PrivateRoute>
              <UserManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <PrivateRoute>
              <Inventory />
            </PrivateRoute>
          }
        />
        <Route
          path="/inventory/:id"
          element={
            <PrivateRoute>
              <InventoryItemDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/tenants"
          element={
            <MasterRoute>
              <TenantManagement />
            </MasterRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <MasterRoute>
              <Settings />
            </MasterRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;