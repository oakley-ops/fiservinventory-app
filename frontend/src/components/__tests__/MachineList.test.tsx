import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MachineList from '../MachineList';
import axios from '../../utils/axios';

// Mock axios
jest.mock('../../utils/axios');

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: jest.fn()
}));

describe('MachineList Component', () => {
  const mockMachines = [
    {
      id: 1,
      name: 'Test Machine',
      model: 'Model A',
      serial_number: 'SN123456',
      location: 'Floor 1',
      manufacturer: 'Test Manufacturer',
      installation_date: '2022-01-01T00:00:00Z',
      last_maintenance_date: '2023-01-01T00:00:00Z',
      next_maintenance_date: '2024-01-01T00:00:00Z',
      notes: 'Test notes',
      status: 'active'
    },
    {
      id: 2,
      name: 'Another Machine',
      model: 'Model B',
      serial_number: 'SN654321',
      location: 'Floor 2',
      manufacturer: 'Another Manufacturer',
      installation_date: '2021-01-01T00:00:00Z',
      last_maintenance_date: '2023-02-01T00:00:00Z',
      next_maintenance_date: '2023-08-01T00:00:00Z',
      notes: 'Another notes',
      status: 'active'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockMachines });
  });

  test('renders machine list with full permissions', async () => {
    // Mock auth context with full permissions
    const mockUseAuth = {
      hasPermission: jest.fn().mockImplementation((permission) => {
        return true; // All permissions granted
      })
    };

    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth')
      .mockReturnValue(mockUseAuth);

    render(
      <BrowserRouter>
        <MachineList />
      </BrowserRouter>
    );
    
    // Verify that all permission-based UI elements are visible
    expect(screen.getByText('Machines')).toBeInTheDocument();
    expect(screen.getByText('Machine Costs')).toBeInTheDocument();
    expect(screen.getByText('Add New Machine')).toBeInTheDocument();
    
    // Wait for machines to load
    expect(await screen.findByText('Test Machine')).toBeInTheDocument();
    expect(screen.getByText('Another Machine')).toBeInTheDocument();
    
    // Edit and Delete buttons should be visible
    expect(screen.getAllByText('Edit').length).toBe(2);
    expect(screen.getAllByText('Delete').length).toBe(2);
  });

  test('hides manage buttons when user lacks management permissions', async () => {
    // Mock auth context with limited permissions
    const mockUseAuth = {
      hasPermission: jest.fn().mockImplementation((permission) => {
        // Only grant view permissions, not management
        if (permission === 'CAN_VIEW_MACHINE_COSTS') return true;
        if (permission === 'CAN_MANAGE_MACHINES') return false;
        return false;
      })
    };

    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth')
      .mockReturnValue(mockUseAuth);

    render(
      <BrowserRouter>
        <MachineList />
      </BrowserRouter>
    );
    
    // Machine Costs button should be visible
    expect(screen.getByText('Machine Costs')).toBeInTheDocument();
    
    // Add New Machine button should not be visible
    expect(screen.queryByText('Add New Machine')).not.toBeInTheDocument();
    
    // Wait for machines to load
    expect(await screen.findByText('Test Machine')).toBeInTheDocument();
    
    // Edit and Delete buttons should not be visible
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  test('hides cost button when user lacks cost view permissions', async () => {
    // Mock auth context with limited permissions
    const mockUseAuth = {
      hasPermission: jest.fn().mockImplementation((permission) => {
        // Only grant machine management, not cost viewing
        if (permission === 'CAN_VIEW_MACHINE_COSTS') return false;
        if (permission === 'CAN_MANAGE_MACHINES') return true;
        return false;
      })
    };

    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth')
      .mockReturnValue(mockUseAuth);

    render(
      <BrowserRouter>
        <MachineList />
      </BrowserRouter>
    );
    
    // Machine Costs button should not be visible
    expect(screen.queryByText('Machine Costs')).not.toBeInTheDocument();
    
    // Add New Machine button should be visible
    expect(screen.getByText('Add New Machine')).toBeInTheDocument();
    
    // Wait for machines to load
    expect(await screen.findByText('Test Machine')).toBeInTheDocument();
    
    // Edit and Delete buttons should be visible
    expect(screen.getAllByText('Edit').length).toBe(2);
    expect(screen.getAllByText('Delete').length).toBe(2);
  });
}); 