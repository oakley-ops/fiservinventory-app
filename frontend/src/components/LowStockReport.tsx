// src/components/LowStockReport.tsx
import React, { useState } from 'react';
import { Table, Button } from 'react-bootstrap';
import { Part } from '../types';
import { Chip } from '@mui/material';
import * as XLSX from 'xlsx';

interface LowStockReportProps {
  data: Part[];
}

const LowStockReport: React.FC<LowStockReportProps> = ({ data }) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Part | 'stockStatus' | 'location';
    direction: 'ascending' | 'descending';
  } | null>(null);

  // Get stock status
  const getStockStatus = (part: Part): { label: string; color: 'error' | 'warning' | 'success' } => {
    if (part.stock_status === 'out_of_stock') {
      return { label: 'Out of Stock', color: 'error' };
    }
    if (part.stock_status === 'low_stock') {
      return { label: 'Low Stock', color: 'warning' };
    }
    return { label: 'In Stock', color: 'success' };
  };

  // Export data to Excel
  const exportToExcel = () => {
    const headers = ['Part Name', 'Location', 'Status', 'Quantity', 'Min Quantity'];
    const rows = data.map(part => {
      const status = getStockStatus(part);
      return [
        part.name,
        part.location || part.machine_name || 'N/A',
        status.label,
        part.quantity.toString(),
        part.minimum_quantity.toString()
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Low Stock Report');
    XLSX.writeFile(workbook, 'low-stock-report.xlsx');
  };

  // Sort function
  const sortData = (data: Part[]) => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      if (sortConfig.key === 'stockStatus') {
        const aStatus = getStockStatus(a).label;
        const bStatus = getStockStatus(b).label;
        return sortConfig.direction === 'ascending'
          ? aStatus.localeCompare(bStatus)
          : bStatus.localeCompare(aStatus);
      }

      if (sortConfig.key === 'location') {
        const aLocation = a.location || a.machine_name || 'N/A';
        const bLocation = b.location || b.machine_name || 'N/A';
        return sortConfig.direction === 'ascending'
          ? aLocation.localeCompare(bLocation)
          : bLocation.localeCompare(aLocation);
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

      return 0;
    });
  };

  const requestSort = (key: keyof Part | 'stockStatus' | 'location') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedParts = sortData(data);

  return (
    <div>
      <div className="mb-3">
        <Button variant="primary" onClick={exportToExcel}>Export to Excel</Button>
      </div>
      <div className="table-responsive">
        <Table hover>
          <thead>
            <tr>
              <th onClick={() => requestSort('name')} style={{ cursor: 'pointer' }}>Part Name</th>
              <th onClick={() => requestSort('location')} style={{ cursor: 'pointer' }}>Location</th>
              <th onClick={() => requestSort('stockStatus')} style={{ cursor: 'pointer' }}>Status</th>
              <th onClick={() => requestSort('quantity')} style={{ cursor: 'pointer' }}>Quantity</th>
              <th onClick={() => requestSort('minimum_quantity')} style={{ cursor: 'pointer' }}>Min Quantity</th>
            </tr>
          </thead>
          <tbody>
            {sortedParts.map((part) => {
              const status = getStockStatus(part);
              const location = part.location || part.machine_name || 'N/A';
              return (
                <tr key={part.part_id}>
                  <td>{part.name}</td>
                  <td>{location}</td>
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