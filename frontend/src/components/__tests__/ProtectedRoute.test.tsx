import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock child component
const MockComponent = () => <div>Protected Content</div>;

// Mock useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: jest.fn()
}));

describe('ProtectedRoute', () => {
  const renderWithRouter = (
    isAuthenticated: boolean,
    hasPermission: boolean,
    requiredPermission?: string,
    fallbackToPublic: boolean = false
  ) => {
    const mockUseAuth = {
      isAuthenticated,
      loading: false,
      hasPermission: () => hasPermission,
      userRole: 'test'
    };

    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth')
      .mockReturnValue(mockUseAuth);

    return render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute
                requiredPermission={requiredPermission}
                fallbackToPublic={fallbackToPublic}
              >
                <MockComponent />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('should render children when authenticated and no permission required', () => {
    renderWithRouter(true, true);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', () => {
    renderWithRouter(false, false);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('should redirect to unauthorized when authenticated but no permission', () => {
    renderWithRouter(true, false, 'REQUIRED_PERMISSION');
    expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
  });

  it('should render children when authenticated and has permission', () => {
    renderWithRouter(true, true, 'REQUIRED_PERMISSION');
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should render children when fallbackToPublic is true, even without permission', () => {
    renderWithRouter(true, false, 'REQUIRED_PERMISSION', true);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should show loading state when loading', () => {
    const mockUseAuth = {
      isAuthenticated: false,
      loading: true,
      hasPermission: () => false,
      userRole: 'test'
    };

    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth')
      .mockReturnValue(mockUseAuth);

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <MockComponent />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should preserve location state when redirecting to login', () => {
    const mockUseAuth = {
      isAuthenticated: false,
      loading: false,
      hasPermission: () => false,
      userRole: 'test'
    };

    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth')
      .mockReturnValue(mockUseAuth);

    const { container } = render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <MockComponent />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // The location state should be preserved in the URL
    expect(container.querySelector('a')?.getAttribute('href')).toContain('from=/protected');
  });
}); 