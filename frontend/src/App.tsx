import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import KPIDashboard from './pages/KPIDashboard';
import Parts from './pages/Parts';
import Machines from './pages/Machines';
import TransactionHistory from './components/TransactionHistory';
import Navigation from './components/Navigation';
import PurchaseOrders from './pages/PurchaseOrders';
import MachineCostReport from './components/MachineCostReport';
import PurchaseOrderList from './components/purchaseOrders/PurchaseOrderList';
import PurchaseOrderDetail from './components/purchaseOrders/PurchaseOrderDetail';
import GeneratePurchaseOrders from './components/purchaseOrders/GeneratePurchaseOrders';
import ManualPOForm from './components/purchaseOrders/ManualPOForm';
import SupplierManagement from './components/suppliers/SupplierManagement';
import SupplierPartsList from './components/suppliers/SupplierPartsList';
// Comment out or remove this import since it's creating an error
// import TestPOPage from './pages/TestPOPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Login route */}
          <Route path="/login" element={<Login />} />
          
          {/* Root path - redirect to dashboard which will check auth */}
          <Route 
            path="/" 
            element={<Navigate to="/dashboard" replace />} 
          />
          
          {/* Dashboard Route */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Navigation>
                  <Dashboard />
                </Navigation>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/kpi-dashboard"
            element={
              <ProtectedRoute>
                <Navigation>
                  <KPIDashboard />
                </Navigation>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/parts/*"
            element={
              <ProtectedRoute>
                <Navigation>
                  <Parts />
                </Navigation>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/machines/*"
            element={
              <ProtectedRoute>
                <Navigation>
                  <Machines />
                </Navigation>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/machine-costs/*"
            element={
              <ProtectedRoute>
                <Navigation>
                  <MachineCostReport />
                </Navigation>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/transactions/*"
            element={
              <ProtectedRoute>
                <Navigation>
                  <TransactionHistory />
                </Navigation>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/purchase-orders"
            element={
              <ProtectedRoute>
                <Navigation>
                  <PurchaseOrders />
                </Navigation>
              </ProtectedRoute>
            }
          >
            <Route index element={<PurchaseOrderList />} />
            <Route path="detail/:id" element={<PurchaseOrderDetail />} />
            <Route path="create" element={<GeneratePurchaseOrders />} />
            <Route path="create-manual" element={<ManualPOForm />} />
            <Route path="suppliers" element={<SupplierManagement />} />
            <Route path="suppliers/:id/parts" element={<SupplierPartsList />} />
            <Route path="*" element={<Navigate to="/purchase-orders" replace />} />
          </Route>
          
          {/* Test PO Page - Public route, no authentication required */}
          <Route path="/test-po" element={<div>Test PO Page</div>} />
          
          {/* Catch-all route - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;