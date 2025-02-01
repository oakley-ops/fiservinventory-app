import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { Form, Card, Badge, Spinner, ListGroup } from 'react-bootstrap';
import axiosInstance from '../utils/axios';
import { useDebounce } from 'use-debounce';
import { AxiosError } from 'axios';
import { ApiErrorResponse } from '../types/api';

interface Part {
  part_id: number;
  name: string;
  description: string;
  manufacturer_part_number: string;
  fiserv_part_number: string;
  quantity: number;
  minimum_quantity: number;
  machine_id: number;
  supplier: string;
  unit_cost: string | number;
  location: string;
}

const PartSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  useEffect(() => {
    const searchParts = async () => {
      if (!debouncedSearchTerm) {
        setParts([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await axiosInstance.get<Part[]>('/api/v1/parts/search', {
          params: { q: debouncedSearchTerm }
        });
        setParts(response.data);
      } catch (err) {
        console.error('Error searching parts:', err);
        const error = err as AxiosError<ApiErrorResponse>;
        setError(error.response?.data?.error || error.response?.data?.message || 'Failed to search parts');
      } finally {
        setLoading(false);
      }
    };

    searchParts();
  }, [debouncedSearchTerm]);

  const getStockStatus = (quantity: number, minimum_quantity: number) => {
    if (quantity <= 0) {
      return <Badge bg="danger">Out of Stock</Badge>;
    } else if (quantity < minimum_quantity) {
      return <Badge bg="warning" text="dark">Low Stock</Badge>;
    }
    return <Badge bg="success">In Stock</Badge>;
  };

  const formatCurrency = (value: string | number): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(numValue) ? '$0.00' : `$${numValue.toFixed(2)}`;
  };

  return (
    <div className="mb-4">
      <Form.Group className="mb-3">
        <Form.Label>Search Parts</Form.Label>
        <Form.Control
          type="text"
          placeholder="Search by name, part number, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Form.Group>

      {loading && (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}

      {error && <div className="text-danger mb-3">{error}</div>}

      <ListGroup>
        {parts.map((part) => (
          <ListGroup.Item key={part.part_id} className="d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-bold">{part.name}</div>
              <div className="text-muted">{part.description}</div>
            </div>
            <div>
              <span className="badge bg-primary rounded-pill">
                Quantity: {part.quantity}
              </span>
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>

      {parts.length === 0 && searchTerm && !loading && (
        <div className="text-muted">No parts found</div>
      )}
    </div>
  );
};

export default PartSearch;
