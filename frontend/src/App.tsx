import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { Provider } from 'react-redux';
import { store } from './store/store';

// Components
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Parts from './pages/Parts';
import Import from './pages/Import';
import Scanner from './pages/Scanner';
import Machines from './pages/Machines';
import PartsUsageForm from './components/PartsUsageForm';
import LoginPage from './components/LoginPage';
import AssignPartToMachineForm from './components/AssignPartToMachineForm';
import ChangePassword from './components/ChangePassword';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const userStr = localStorage.getItem('user');
  const token = localStorage.getItem('token');

  if (!userStr || !token) {
    return <Navigate to="/login" />;
  }

  const user = JSON.parse(userStr);

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Provider store={store}>
      <Router>
        <div>
          {isAuthenticated && <Navigation />}
          <Container className="mt-4">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Navigate to="/dashboard" />
                </ProtectedRoute>
              } />

              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />

              <Route path="/parts" element={
                <ProtectedRoute>
                  <Parts />
                </ProtectedRoute>
              } />

              <Route path="/import" element={
                <ProtectedRoute requiredRole="admin">
                  <Import />
                </ProtectedRoute>
              } />

              <Route path="/scanner" element={
                <ProtectedRoute>
                  <Scanner />
                </ProtectedRoute>
              } />

              <Route path="/machines/*" element={
                <ProtectedRoute>
                  <Machines />
                </ProtectedRoute>
              } />

              <Route path="/parts-usage" element={
                <ProtectedRoute>
                  <PartsUsageForm />
                </ProtectedRoute>
              } />

              <Route path="/assign-part" element={
                <ProtectedRoute>
                  <AssignPartToMachineForm />
                </ProtectedRoute>
              } />

              <Route path="/change-password" element={
                <ProtectedRoute>
                  <ChangePassword />
                </ProtectedRoute>
              } />
            </Routes>
          </Container>
        </div>
      </Router>
    </Provider>
  );
};

export default App;