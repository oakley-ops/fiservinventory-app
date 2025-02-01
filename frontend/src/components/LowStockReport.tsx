// src/components/LowStockReport.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { Card, Button, Form, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

interface Part {
  part_id: number;
  name: string;
  quantity: number;
  minimum_quantity: number;
  manufacturer_part_number: string;
  fiserv_part_number: string;
  supplier: string;
  unit_cost: number | string;
}

const LowStockReport: React.FC = () => {
  const navigate = useNavigate();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(10);
  const [sortField, setSortField] = useState<keyof Part>('quantity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchLowStockParts();
  }, [threshold]);

  const fetchLowStockParts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/v1/reports/low-stock`, {
        params: { threshold },
      });
      setParts(response.data);
    } catch (error: any) {
      console.error('Error fetching low stock parts:', error);
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    // Prepare CSV data
    const headers = [
      'Part Name',
      'Manufacturer Part #',
      'Fiserv Part #',
      'Current Quantity',
      'Minimum Quantity',
      'Supplier',
      'Unit Cost',
      'Total Value',
      'Status'
    ];

    const getStatusText = (quantity: number): string => {
      if (quantity === 0) return 'Out of Stock';
      if (quantity <= threshold / 2) return 'Critical';
      return 'Low Stock';
    };

    const rows = parts.map(part => {
      // Convert unit_cost to number if it's a string
      const unitCost = typeof part.unit_cost === 'string' ? parseFloat(part.unit_cost) : part.unit_cost;
      const formattedUnitCost = isNaN(unitCost) ? '0.00' : unitCost.toFixed(2);
      const totalCost = isNaN(unitCost) ? 0 : unitCost * part.quantity;
      
      return [
        part.name,
        part.manufacturer_part_number,
        part.fiserv_part_number,
        part.quantity.toString(),
        part.minimum_quantity.toString(),
        part.supplier,
        `$${formattedUnitCost}`,
        `$${totalCost.toFixed(2)}`,
        getStatusText(part.quantity)
      ];
    });

    // Add report metadata
    const metadata = [
      ['Low Stock Report'],
      [`Generated on: ${new Date().toLocaleString()}`],
      [`Threshold: ${threshold}`],
      [] // Empty row for spacing
    ];

    // Combine all rows
    const csvContent = [
      ...metadata,
      headers,
      ...rows
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `low-stock-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (quantity: number) => {
    if (quantity === 0) {
      return <Badge bg="danger">Out of Stock</Badge>;
    }
    if (quantity <= threshold / 2) {
      return <Badge bg="warning" text="dark">Critical</Badge>;
    }
    return <Badge bg="info">Low Stock</Badge>;
  };

  const handleSort = (field: keyof Part) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedParts = [...parts].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction * aValue.localeCompare(bValue);
    }
    return direction * (Number(aValue) - Number(bValue));
  });

  const handleOrderMore = (partId: number) => {
    // Navigate to order form or open modal
    navigate(`/parts/${partId}/order`);
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3 text-muted">Loading low stock report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Report</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchLowStockParts}>
            Try Again
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-100">
      <div className="p-4 border-bottom">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
          <div>
            <h2 className="h5 mb-1">Low Stock Report</h2>
            <small className="text-muted d-block">
              Showing parts with quantity below threshold
            </small>
          </div>
          <div className="d-flex flex-wrap gap-3 align-items-center">
            <Form.Group controlId="threshold" className="d-flex align-items-center gap-2 mb-0">
              <Form.Label className="mb-0 text-nowrap">Threshold:</Form.Label>
              <Form.Control
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                min="1"
                style={{ width: '80px' }}
                size="sm"
              />
            </Form.Group>
            {parts.length > 0 && (
              <Button
                variant="outline-primary"
                size="sm"
                onClick={handleExportCSV}
                className="text-nowrap"
              >
                Export CSV
              </Button>
            )}
            <Button 
              variant="outline-secondary" 
              size="sm"
              onClick={fetchLowStockParts}
              className="text-nowrap"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {parts.length === 0 ? (
          <Alert variant="success">
            <Alert.Heading>All Stock Levels are Good!</Alert.Heading>
            <p className="mb-0">
              No parts are currently below the threshold of {threshold} units.
            </p>
          </Alert>
        ) : (
          <div className="table-responsive">
            <Table hover bordered className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="border-bottom" onClick={() => handleSort('name')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Part Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="border-bottom" style={{ whiteSpace: 'nowrap' }}>Part Numbers</th>
                  <th className="border-bottom" onClick={() => handleSort('quantity')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Quantity {sortField === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="border-bottom" style={{ whiteSpace: 'nowrap' }}>Supplier</th>
                  <th className="border-bottom" style={{ whiteSpace: 'nowrap' }}>Value</th>
                  <th className="border-bottom" style={{ whiteSpace: 'nowrap' }}>Status</th>
                  <th className="border-bottom" style={{ whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedParts.map((part) => (
                  <tr key={part.part_id}>
                    <td style={{ minWidth: '200px' }}>{part.name}</td>
                    <td style={{ minWidth: '150px' }}>
                      <small>
                        <div><strong>MFR:</strong> {part.manufacturer_part_number}</div>
                        <div><strong>Fiserv:</strong> {part.fiserv_part_number}</div>
                      </small>
                    </td>
                    <td className="text-center" style={{ minWidth: '100px' }}>
                      <span className={part.quantity === 0 ? 'text-danger' : 'text-warning'}>
                        <strong>{part.quantity}</strong>
                      </span>
                      <small className="text-muted d-block">
                        Min: {part.minimum_quantity}
                      </small>
                    </td>
                    <td style={{ minWidth: '120px' }}>{part.supplier}</td>
                    <td style={{ minWidth: '120px' }}>
                      <small>
                        {(() => {
                          const unitCost = typeof part.unit_cost === 'string' ? parseFloat(part.unit_cost) : part.unit_cost;
                          const formattedUnitCost = isNaN(unitCost) ? '0.00' : unitCost.toFixed(2);
                          const totalCost = isNaN(unitCost) ? 0 : unitCost * part.quantity;
                          
                          return (
                            <>
                              <div><strong>Unit:</strong> ${formattedUnitCost}</div>
                              <div><strong>Total:</strong> ${totalCost.toFixed(2)}</div>
                            </>
                          );
                        })()}
                      </small>
                    </td>
                    <td style={{ minWidth: '100px' }}>{getStatusBadge(part.quantity)}</td>
                    <td style={{ minWidth: '200px' }}>
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleOrderMore(part.part_id)}
                          className="text-nowrap"
                        >
                          Order More
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => navigate(`/parts/${part.part_id}/edit`)}
                          className="text-nowrap"
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LowStockReport;