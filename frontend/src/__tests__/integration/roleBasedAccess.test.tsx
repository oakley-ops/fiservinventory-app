import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { act } from 'react-dom/test-utils';

// Define user type
interface User {
  id: number;
  username: string;
  role: string;
}

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock components
jest.mock('../../pages/Parts', () => () => <div>Parts Page</div>);
jest.mock('../../pages/PurchaseOrders', () => () => <div>Purchase Orders Page</div>);
jest.mock('../../pages/Transactions', () => () => <div>Transactions Page</div>);
jest.mock('../../pages/UserManagement', () => () => <div>User Management Page</div>);
jest.mock('../../pages/Login', () => () => <div>Login Page</div>);
jest.mock('../../pages/Unauthorized', () => () => <div>Unauthorized Page</div>);

describe('Role-Based Access Control Integration Tests', () => {
  const renderWithAuth = (initialUser: User | null = null) => {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/parts" element={<div>Parts Page</div>} />
            <Route path="/purchase-orders" element={<div>Purchase Orders Page</div>} />
            <Route path="/transactions" element={<div>Transactions Page</div>} />
            <Route path="/users" element={<div>User Management Page</div>} />
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Navigation and Access Control', () => {
    it('should redirect to login when not authenticated', async () => {
      renderWithAuth();
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    it('should allow admin to access all pages', async () => {
      const adminUser: User = {
        id: 1,
        username: 'admin',
        role: 'admin'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: adminUser });

      renderWithAuth(adminUser);

      await waitFor(() => {
        expect(screen.getByText('Home Page')).toBeInTheDocument();
      });

      // Admin should be able to access all pages
      expect(screen.queryByText('Unauthorized Page')).not.toBeInTheDocument();
    });

    it('should restrict tech user access', async () => {
      const techUser: User = {
        id: 2,
        username: 'tech',
        role: 'tech'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: techUser });

      renderWithAuth(techUser);

      await waitFor(() => {
        expect(screen.getByText('Home Page')).toBeInTheDocument();
      });

      // Tech should be able to access parts page
      fireEvent.click(screen.getByText('Parts'));
      expect(screen.getByText('Parts Page')).toBeInTheDocument();

      // Tech should not be able to access user management
      fireEvent.click(screen.getByText('User Management'));
      expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
    });

    it('should restrict purchasing user access', async () => {
      const purchasingUser: User = {
        id: 3,
        username: 'purchasing',
        role: 'purchasing'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: purchasingUser });

      renderWithAuth(purchasingUser);

      await waitFor(() => {
        expect(screen.getByText('Home Page')).toBeInTheDocument();
      });

      // Purchasing should be able to access purchase orders
      fireEvent.click(screen.getByText('Purchase Orders'));
      expect(screen.getByText('Purchase Orders Page')).toBeInTheDocument();

      // Purchasing should not be able to access user management
      fireEvent.click(screen.getByText('User Management'));
      expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
    });
  });

  describe('Component-Level Access Control', () => {
    it('should show/hide buttons based on user role', async () => {
      const adminUser: User = {
        id: 1,
        username: 'admin',
        role: 'admin'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: adminUser });

      const TestComponent = () => {
        const { hasPermission } = useAuth();
        return (
          <div>
            {hasPermission('CAN_ADD_PARTS') && (
              <button>Add Part</button>
            )}
            {hasPermission('CAN_MANAGE_PURCHASE_ORDERS') && (
              <button>Create Purchase Order</button>
            )}
            {hasPermission('CAN_VIEW_TRANSACTIONS') && (
              <button>View Transactions</button>
            )}
          </div>
        );
      };

      render(
        <MemoryRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        // Admin should see all buttons
        expect(screen.getByText('Add Part')).toBeInTheDocument();
        expect(screen.getByText('Create Purchase Order')).toBeInTheDocument();
        expect(screen.getByText('View Transactions')).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('should include role information in API requests', async () => {
      const adminUser: User = {
        id: 1,
        username: 'admin',
        role: 'admin'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: adminUser });
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      renderWithAuth(adminUser);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/auth/verify'),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: expect.stringContaining('Bearer')
            })
          })
        );
      });
    });

    it('should handle API errors gracefully', async () => {
      const adminUser: User = {
        id: 1,
        username: 'admin',
        role: 'admin'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: adminUser });
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 403,
          data: { error: 'Access forbidden' }
        }
      });

      renderWithAuth(adminUser);

      await waitFor(() => {
        expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
      });
    });
  });

  describe('Session Management', () => {
    it('should maintain session across page refreshes', async () => {
      const adminUser: User = {
        id: 1,
        username: 'admin',
        role: 'admin'
      };

      // Mock initial token verification
      mockedAxios.get.mockResolvedValueOnce({ data: adminUser });

      // Store token in localStorage
      localStorage.setItem('token', 'valid-token');

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('Home Page')).toBeInTheDocument();
      });

      // Verify token was used
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/verify'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token'
          })
        })
      );
    });

    it('should handle token expiration', async () => {
      const adminUser: User = {
        id: 1,
        username: 'admin',
        role: 'admin'
      };

      // Mock token verification to fail
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: 'Token expired' }
        }
      });

      // Store expired token
      localStorage.setItem('token', 'expired-token');

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });

      // Verify token was removed
      expect(localStorage.getItem('token')).toBeNull();
    });
  });
}); 