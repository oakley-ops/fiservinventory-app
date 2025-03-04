import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Parts from './pages/Parts';
import Machines from './pages/Machines';
import TransactionHistory from './components/TransactionHistory';
import Navigation from './components/Navigation';

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
            path="/transactions/*"
            element={
              <ProtectedRoute>
                <Navigation>
                  <TransactionHistory />
                </Navigation>
              </ProtectedRoute>
            }
          />
          
          {/* Catch-all route - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;