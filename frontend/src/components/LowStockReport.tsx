// src/components/LowStockReport.tsx
import React, { useState } from 'react';
import { Table, Button } from 'react-bootstrap';
import { Part } from '../types';
import { Chip } from '@mui/material';
import * as XLSX from 'xlsx';

interface LowStockPart {
  id: number;
  name: string;
  quantity: number;
  minimum_quantity: number;
  location: string;
  status: string;
}

interface LowStockReportProps {
  data: (Part | LowStockPart)[];
}

const LowStockReport: React.FC<LowStockReportProps> = ({ data }) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof (Part | LowStockPart) | 'stockStatus' | 'location';
    direction: 'ascending' | 'descending';
  } | null>(null);

  // Get stock status
  const getStockStatus = (part: Part | LowStockPart): { label: string; color: 'error' | 'warning' | 'success' } => {
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

  // Export data to Excel
  const exportToExcel = () => {
    const headers = ['Part Name', 'Location', 'Status', 'Quantity', 'Min Quantity'];
    
    const rows = data.map(part => {
      const status = getStockStatus(part);
      return [
        part.name || 'N/A',
        'location' in part ? part.location : (part.machine_name || 'N/A'),
        status.label,
        part.quantity.toString(),
        part.minimum_quantity.toString()
      ];
    });

    // Create worksheet from data
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Set column widths
    const columnWidths = [
      { wch: 30 }, // Part Name
      { wch: 20 }, // Location
      { wch: 15 }, // Status
      { wch: 10 }, // Quantity
      { wch: 15 }, // Min Quantity
    ];
    worksheet['!cols'] = columnWidths;

    // Style header row
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const headerStyle = {
      font: { bold: true },
      fill: { 
        fgColor: { rgb: "EEEEEE" },
        patternType: 'solid'
      },
      alignment: { 
        horizontal: 'center',
        vertical: 'center',
        wrapText: true
      },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    // Apply header style to first row
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellRef]) continue;
      worksheet[cellRef].s = headerStyle;
    }

    // Create workbook and append sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Status');
    
    // Generate filename with current date
    const filename = `inventory_status_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Export file
    XLSX.writeFile(workbook, filename);
  };

  // Sort function
  const sortData = (key: keyof (Part | LowStockPart) | 'stockStatus' | 'location'): void => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Get sorted data
  const getSortedData = (): (Part | LowStockPart)[] => {
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

      if (sortConfig.key === 'location') {
        const aLocation = 'location' in a ? a.location : (a.machine_name || 'N/A');
        const bLocation = 'location' in b ? b.location : (b.machine_name || 'N/A');
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
        <Button variant="primary" onClick={exportToExcel}>
          Export to Excel
        </Button>
      </div>
      <div className="table-responsive">
        <Table hover>
          <thead>
            <tr>
              <th onClick={() => sortData('name')}>
                Part Name {sortConfig?.key === 'name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </th>
              <th onClick={() => sortData('location')}>
                Location {sortConfig?.key === 'location' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
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
            </tr>
          </thead>
          <tbody>
            {sortedParts.map((part) => {
              const status = getStockStatus(part);
              const id = 'part_id' in part ? part.part_id : part.id;
              const location = 'location' in part ? part.location : (part.machine_name || 'N/A');
              return (
                <tr key={id}>
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