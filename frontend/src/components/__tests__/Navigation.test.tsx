import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navigation from '../Navigation';

describe('Navigation Component', () => {
  const renderWithRouter = (component: React.ReactNode) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  test('renders navigation links', () => {
    renderWithRouter(<Navigation />);
    
    // Check for main navigation links
    expect(screen.getByText(/Parts/i)).toBeInTheDocument();
    expect(screen.getByText(/History/i)).toBeInTheDocument();
    expect(screen.getByText(/Machines/i)).toBeInTheDocument();
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });

  test('renders brand name', () => {
    renderWithRouter(<Navigation />);
    
    // Check for the brand name
    expect(screen.getByText(/Tech Inventory/i)).toBeInTheDocument();
  });
});
