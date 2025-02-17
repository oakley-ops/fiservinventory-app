import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import PartsList from '../PartsList';
import axiosInstance from '../../utils/axios';

// Mock axios
jest.mock('../../utils/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    delete: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>;

// Mock data
const mockPartsData = {
  items: [
    {
      part_id: 1,
      name: 'Resistor',
      description: '10K Ohm 1/4W',
      manufacturer: 'Test Manufacturer',
      manufacturer_part_number: 'MPN123',
      fiserv_part_number: 'FPN123',
      quantity: 100,
      minimum_quantity: 50,
      location: 'Test Location',
      notes: 'Test Notes',
      last_ordered_date: '2025-01-01',
      cost: 100,
      status: 'active'
    },
    {
      part_id: 2,
      name: 'Capacitor',
      description: '100μF 25V',
      manufacturer: 'Test Manufacturer',
      manufacturer_part_number: 'MPN123',
      fiserv_part_number: 'FPN123',
      quantity: 25,
      minimum_quantity: 30,
      location: 'Test Location',
      notes: 'Test Notes',
      last_ordered_date: '2025-01-01',
      cost: 100,
      status: 'low_stock'
    }
  ],
  total: 2
};

const mockLocationsData = ['Location 1', 'Location 2'];

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('PartsList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
    // Mock successful responses by default
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/api/v1/parts')) {
        return Promise.resolve({
          data: mockPartsData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        });
      } else if (url.includes('/api/v1/locations')) {
        return Promise.resolve({
          data: mockLocationsData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
    mockedAxios.delete.mockImplementation((url: string) => {
      if (url.includes('/api/v1/parts/')) {
        return Promise.resolve({
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
          data: {}
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  const waitForGridLoad = async () => {
    // Wait for grid to exist
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    }, { timeout: 15000 });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    }, { timeout: 15000 });

    // Validate content states
    await waitFor(() => {
      const rows = screen.queryAllByRole('row');
      const noRows = screen.queryByText(/no rows/i);
      expect(rows.length > 1 || noRows).toBeTruthy();
    }, { timeout: 15000 });
  };

  const findCellByText = async (text: string) => {
    await waitForGridLoad();
    
    return await waitFor(
      () => {
        // First try to find by cell role
        const cells = screen.queryAllByRole('gridcell');
        const cell = cells.find(el => el.textContent?.includes(text));
        
        if (cell) return cell;

        // If no cells found, try finding by text directly
        const textElement = screen.getByText(text);
        return textElement.closest('[role="gridcell"]') || textElement;
      },
      { timeout: 15000 }
    );
  };

  const findButtonInRow = async (rowText: string, buttonTestId: string) => {
    const cell = await findCellByText(rowText);
    const row = cell.closest('.MuiDataGrid-row');
    if (!row) {
      throw new Error('Could not find row containing cell');
    }
    
    return within(row as HTMLElement).getByTestId(buttonTestId);
  };

  it('renders without crashing', async () => {
    renderWithRouter(<PartsList />);
    await waitForGridLoad();
  }, 20000);

  it('displays parts data correctly', async () => {
    renderWithRouter(<PartsList />);
    await waitForGridLoad();

    const resistor = await findCellByText('Resistor');
    expect(resistor).toBeInTheDocument();
    
    const capacitor = await findCellByText('Capacitor');
    expect(capacitor).toBeInTheDocument();
  }, 20000);

  it('handles search functionality', async () => {
    const user = userEvent.setup();
    renderWithRouter(<PartsList />);
    await waitForGridLoad();

    const searchInput = screen.getByPlaceholderText('Search parts...');
    await user.type(searchInput, 'Resistor');

    await waitFor(async () => {
      const cells = screen.queryAllByRole('gridcell');
      expect(cells.some(cell => cell.textContent?.includes('Resistor'))).toBe(true);
    }, { timeout: 15000 });
  }, 20000);

  it('handles delete functionality', async () => {
    const user = userEvent.setup();
    
    renderWithRouter(<PartsList />);
    await waitForGridLoad();

    // Find and click delete button in the row containing 'Resistor'
    const deleteButton = await screen.findAllByTestId('delete-button');
    await user.click(deleteButton[0]);

    // Verify confirmation was called
    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
    });

    // Verify API call was made
    await waitFor(() => {
      expect((mockedAxios as any).history.delete.length).toBe(1);
      expect((mockedAxios as any).history.delete[0].url).toBe('/api/v1/parts/1');
    });
  }, 20000);

  it('handles empty state correctly', async () => {
    // Mock empty response
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/api/v1/parts')) {
        return Promise.resolve({ 
          data: { items: [], total: 0 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    renderWithRouter(<PartsList />);
    await waitForGridLoad();
    
    // Wait for the empty state message
    await waitFor(() => {
      // Try multiple possible empty state messages
      const noRowsElement = screen.queryByText(/no rows/i) || 
                           screen.queryByText(/no data/i) ||
                           screen.queryByText(/no results/i);
      expect(noRowsElement).toBeInTheDocument();
    }, { timeout: 15000 });
  }, 20000);
});
