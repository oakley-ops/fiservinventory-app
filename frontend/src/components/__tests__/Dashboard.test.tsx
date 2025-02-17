// Mock axios before imports
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(() => Promise.resolve({
      data: {
        totalParts: 100,
        lowStockCount: 5,
        outOfStockCount: 2,
        lowStockParts: [
          {
            id: 1,
            name: 'Part 1',
            quantity: 3,
            minimum_quantity: 5,
            location: 'A1',
            status: 'active'
          }
        ],
        recentUsage: [
          {
            id: 1,
            date: '2023-01-01',
            partName: 'Part 1',
            machine: 'Machine 1',
            quantity: 5,
            type: 'usage'
          }
        ]
      }
    })),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    }
  }))
}));

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import Dashboard from '../Dashboard';
import { BrowserRouter } from 'react-router-dom';

const mockAxios = axios.create();

const mockDashboardData = {
  totalParts: 100,
  lowStockCount: 5,
  outOfStockCount: 2,
  lowStockParts: [
    {
      id: 1,
      name: 'Part 1',
      quantity: 3,
      minimum_quantity: 5,
      location: 'A1',
      status: 'active'
    }
  ],
  recentUsage: [
    {
      id: 1,
      date: '2023-01-01',
      partName: 'Part 1',
      machine: 'Machine 1',
      quantity: 5,
      type: 'usage'
    }
  ]
};

const renderWithRouter = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  let mockEventSource: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios response
    (mockAxios.get as jest.Mock).mockResolvedValue({ data: mockDashboardData });
    
    // Mock EventSource
    mockEventSource = {
      addEventListener: jest.fn(),
      close: jest.fn()
    };
    
    (global as any).EventSource = jest.fn(() => mockEventSource);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders dashboard with initial data', async () => {
    renderWithRouter(<Dashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('total-parts')).toHaveTextContent('100');
      expect(screen.getByTestId('low-stock-count')).toHaveTextContent('5');
      expect(screen.getByTestId('out-of-stock-count')).toHaveTextContent('2');
    });

    // Check low stock list
    expect(screen.getByText('Part 1')).toBeInTheDocument();
    expect(screen.getByText('Machine 1')).toBeInTheDocument();
  });

  it('handles real-time updates via EventSource', async () => {
    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Simulate receiving a real-time update
    const updatedData = {
      ...mockDashboardData,
      totalParts: 150,
      lowStockCount: 6
    };

    // Get the event listener callback
    const messageCallback = mockEventSource.addEventListener.mock.calls.find(
      ([eventName]: [string]) => eventName === 'message'
    )?.[1];

    expect(messageCallback).toBeDefined();

    // Simulate receiving an event
    await act(async () => {
      messageCallback({ data: JSON.stringify(updatedData) });
    });

    // Check if the UI updates with new data
    await waitFor(() => {
      expect(screen.getByTestId('total-parts')).toHaveTextContent('150');
      expect(screen.getByTestId('low-stock-count')).toHaveTextContent('6');
    });
  });

  it('handles error states', async () => {
    (mockAxios.get as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch data'));
    
    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch dashboard data')).toBeInTheDocument();
    });
  });
});
