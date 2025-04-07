import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PurchaseOrderList from '../purchaseOrders/PurchaseOrderList';

// Mock API service
jest.mock('../../services/api', () => ({
  purchaseOrdersApi: {
    getAll: jest.fn().mockResolvedValue({
      data: [
        { 
          po_id: 1, 
          po_number: 'PO-001', 
          supplier_name: 'Test Supplier', 
          status: 'pending',
          total_amount: 100.50,
          created_at: '2023-04-01T12:00:00Z'
        },
        { 
          po_id: 2, 
          po_number: 'PO-002', 
          supplier_name: 'Another Supplier', 
          status: 'approved',
          total_amount: 250.75,
          created_at: '2023-04-02T14:30:00Z'
        }
      ]
    }),
    delete: jest.fn().mockResolvedValue({ data: { message: 'Deleted successfully' } }),
    getById: jest.fn()
  }
}));

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: jest.fn()
}));

describe('PurchaseOrderList Component', () => {
  test('renders purchase order list with full permissions', async () => {
    // Mock auth context with full permissions
    const mockUseAuth = {
      hasPermission: jest.fn().mockImplementation(() => true) // All permissions granted
    };

    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth')
      .mockReturnValue(mockUseAuth);

    render(
      <BrowserRouter>
        <PurchaseOrderList />
      </BrowserRouter>
    );
    
    // Buttons that should be visible with full permissions
    expect(await screen.findByText('Manage Suppliers')).toBeInTheDocument();
    expect(screen.getByText('Create Manual PO')).toBeInTheDocument();
    expect(screen.getByText('Export All')).toBeInTheDocument();
    
    // Wait for POs to load
    expect(await screen.findByText('PO-001')).toBeInTheDocument();
    expect(screen.getByText('PO-002')).toBeInTheDocument();
    
    // Delete buttons should be visible (represented by icons, but we can check for the container elements)
    // In this case, we know there are 2 POs, and each should have a delete button
    const deleteButtons = screen.getAllByRole('button');
    expect(deleteButtons.length).toBeGreaterThan(3); // At least the 3 action buttons + delete icons
  });

  test('hides supplier management button when user lacks permission', async () => {
    // Mock auth context with limited permissions
    const mockUseAuth = {
      hasPermission: jest.fn().mockImplementation((permission) => {
        if (permission === 'CAN_MANAGE_SUPPLIERS') return false;
        return true; // All other permissions granted
      })
    };

    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth')
      .mockReturnValue(mockUseAuth);

    render(
      <BrowserRouter>
        <PurchaseOrderList />
      </BrowserRouter>
    );
    
    // Manage Suppliers button should not be visible
    expect(screen.queryByText('Manage Suppliers')).not.toBeInTheDocument();
    
    // Other buttons should be visible
    expect(screen.getByText('Create Manual PO')).toBeInTheDocument();
    expect(screen.getByText('Export All')).toBeInTheDocument();
  });

  test('hides create PO button when user lacks permission', async () => {
    // Mock auth context with limited permissions
    const mockUseAuth = {
      hasPermission: jest.fn().mockImplementation((permission) => {
        if (permission === 'CAN_CREATE_PURCHASE_ORDERS') return false;
        return true; // All other permissions granted
      })
    };

    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth')
      .mockReturnValue(mockUseAuth);

    render(
      <BrowserRouter>
        <PurchaseOrderList />
      </BrowserRouter>
    );
    
    // Create Manual PO button should not be visible
    expect(screen.queryByText('Create Manual PO')).not.toBeInTheDocument();
    
    // Other buttons should be visible
    expect(screen.getByText('Manage Suppliers')).toBeInTheDocument();
    expect(screen.getByText('Export All')).toBeInTheDocument();
  });

  test('hides export button when user lacks permission', async () => {
    // Mock auth context with limited permissions
    const mockUseAuth = {
      hasPermission: jest.fn().mockImplementation((permission) => {
        if (permission === 'CAN_EXPORT_DATA') return false;
        return true; // All other permissions granted
      })
    };

    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth')
      .mockReturnValue(mockUseAuth);

    render(
      <BrowserRouter>
        <PurchaseOrderList />
      </BrowserRouter>
    );
    
    // Export All button should not be visible
    expect(screen.queryByText('Export All')).not.toBeInTheDocument();
    
    // Other buttons should be visible
    expect(screen.getByText('Manage Suppliers')).toBeInTheDocument();
    expect(screen.getByText('Create Manual PO')).toBeInTheDocument();
  });

  test('hides delete buttons when user lacks permission', async () => {
    // Mock auth context with limited permissions
    const mockUseAuth = {
      hasPermission: jest.fn().mockImplementation((permission) => {
        if (permission === 'CAN_DELETE_PURCHASE_ORDERS') return false;
        return true; // All other permissions granted
      })
    };

    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth')
      .mockReturnValue(mockUseAuth);

    render(
      <BrowserRouter>
        <PurchaseOrderList />
      </BrowserRouter>
    );
    
    // All control buttons should be visible
    expect(screen.getByText('Manage Suppliers')).toBeInTheDocument();
    expect(screen.getByText('Create Manual PO')).toBeInTheDocument();
    expect(screen.getByText('Export All')).toBeInTheDocument();
    
    // Wait for POs to load
    expect(await screen.findByText('PO-001')).toBeInTheDocument();
    
    // There should be fewer buttons total since delete buttons are hidden
    // Each row would normally have a view and delete button
    // Now each row should only have a view button
    const buttons = screen.getAllByRole('button');
    // This would include the 3 action buttons + only view icons (no delete)
    expect(buttons.length).toBe(7); // 3 action buttons + 2 view buttons + 2 table rows
  });
}); 