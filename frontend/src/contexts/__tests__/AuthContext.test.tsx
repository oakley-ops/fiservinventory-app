import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('AuthContext', () => {
  const TestComponent = () => {
    const { isAuthenticated, user, loading } = useAuth();
    return (
      <div>
        <div data-testid="isAuthenticated">{isAuthenticated.toString()}</div>
        <div data-testid="user">{user ? user.username : 'null'}</div>
        <div data-testid="loading">{loading.toString()}</div>
      </div>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  it('should initialize with default state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('should handle successful login', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'admin'
    };

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        user: mockUser,
        token: 'test-token'
      }
    });

    const LoginTest = () => {
      const { login } = useAuth();
      return (
        <button onClick={() => login('testuser', 'password')}>Login</button>
      );
    };

    render(
      <AuthProvider>
        <LoginTest />
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'test-token');
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe('testuser');
  });

  it('should handle login error', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Invalid credentials'
        }
      }
    });

    const LoginTest = () => {
      const { login } = useAuth();
      return (
        <button onClick={() => login('testuser', 'wrongpassword')}>Login</button>
      );
    };

    render(
      <AuthProvider>
        <LoginTest />
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('should handle logout', async () => {
    // First login
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'admin'
    };

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        user: mockUser,
        token: 'test-token'
      }
    });

    const LogoutTest = () => {
      const { login, logout } = useAuth();
      return (
        <>
          <button onClick={() => login('testuser', 'password')}>Login</button>
          <button onClick={logout}>Logout</button>
        </>
      );
    };

    render(
      <AuthProvider>
        <LogoutTest />
        <TestComponent />
      </AuthProvider>
    );

    // Login
    await act(async () => {
      screen.getByText('Login').click();
    });

    // Logout
    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('should handle token verification', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'admin'
    };

    localStorageMock.getItem.mockReturnValueOnce('valid-token');
    mockedAxios.get.mockResolvedValueOnce({
      data: mockUser
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for the initial loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe('testuser');
  });

  it('should handle token verification error', async () => {
    localStorageMock.getItem.mockReturnValueOnce('invalid-token');
    mockedAxios.get.mockRejectedValueOnce(new Error('Invalid token'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for the initial loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');
  });
}); 