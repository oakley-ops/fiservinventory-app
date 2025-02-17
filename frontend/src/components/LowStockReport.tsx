// src/components/LowStockReport.tsx
import React, { useState } from 'react';
import { Table, Button } from 'react-bootstrap';
import { Part } from '../types';
import { Chip } from '@mui/material';

interface LowStockReportProps {
  data: Part[];
}

const LowStockReport: React.FC<LowStockReportProps> = ({ data }) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Part | 'stockStatus';
    direction: 'ascending' | 'descending';
  } | null>(null);

  // Get stock status
  const getStockStatus = (part: Part): { label: string; color: 'error' | 'warning' | 'success' } => {
    if (part.quantity === 0) {
      return { label: 'Out of Stock', color: 'error' };
    }
    if (part.quantity <= part.minimum_quantity * 0.25) {
      return { label: 'Critical', color: 'error' };
    }
    if (part.quantity < part.minimum_quantity) {
      return { label: 'Low', color: 'warning' };
    }
    return { label: 'Healthy', color: 'success' };
  };

  // Export data to CSV
  const exportToCSV = () => {
    const headers = ['Part Name', 'Fiserv Part #', 'Status', 'Quantity', 'Min Quantity', 'Location'];
    
    const rows = data.map(part => {
      const status = getStockStatus(part);
      return [
        part.name || 'N/A',
        part.fiserv_part_number || 'N/A',
        status.label,
        part.quantity.toString(),
        part.minimum_quantity.toString(),
        part.machine_name || 'N/A'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'inventory_status_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Sort function
  const sortData = (key: keyof Part | 'stockStatus'): void => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Get sorted data
  const getSortedData = (): Part[] => {
    if (!sortConfig) {
      return data;
    }

    return [...data].sort((a, b) => {
      if (sortConfig.key === 'stockStatus') {
        const aStatus = getStockStatus(a);
        const bStatus = getStockStatus(b);
        return sortConfig.direction === 'ascending'
          ? aStatus.label.localeCompare(bStatus.label)
          : bStatus.label.localeCompare(aStatus.label);
      }

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'ascending'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'ascending'
          ? aValue - bValue
          : bValue - aValue;
      }

      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (bValue === null) return sortConfig.direction === 'ascending' ? 1 : -1;

      return 0;
    });
  };

  const sortedParts = getSortedData();

  if (!data || data.length === 0) {
    return <div className="text-muted">No inventory alerts found</div>;
  }

  return (
    <div>
      <div className="mb-3">
        <Button variant="primary" onClick={exportToCSV}>
          Export to CSV
        </Button>
      </div>
      <div className="table-responsive">
        <Table hover>
          <thead>
            <tr>
              <th onClick={() => sortData('name')}>
                Part Name {sortConfig?.key === 'name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </th>
              <th onClick={() => sortData('fiserv_part_number')}>
                Fiserv Part # {sortConfig?.key === 'fiserv_part_number' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </th>
              <th onClick={() => sortData('stockStatus')}>
                Status {sortConfig?.key === 'stockStatus' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </th>
              <th onClick={() => sortData('quantity')}>
                Quantity {sortConfig?.key === 'quantity' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </th>
              <th onClick={() => sortData('minimum_quantity')}>
                Min Quantity {sortConfig?.key === 'minimum_quantity' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </th>
              <th onClick={() => sortData('machine_name')}>
                Location {sortConfig?.key === 'machine_name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedParts.map((part) => {
              const status = getStockStatus(part);
              return (
                <tr key={part.part_id}>
                  <td>{part.name}</td>
                  <td>{part.fiserv_part_number || 'N/A'}</td>
                  <td>
                    <Chip 
                      label={status.label}
                      color={status.color}
                      size="small"
                      variant="outlined"
                    />
                  </td>
                  <td>{part.quantity}</td>
                  <td>{part.minimum_quantity}</td>
                  <td>{part.machine_name || 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default LowStockReport;