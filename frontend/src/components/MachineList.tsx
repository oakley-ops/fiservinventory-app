import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDebounce } from 'use-debounce';
import { Card, Table, Form, InputGroup, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { API_URL } from '../config';

interface Machine {
  machine_id: number;
  name: string;
  model: string;
  serial_number: string;
  location?: string;
  manufacturer?: string;
  installation_date?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  parts_count: number;
}

interface SortConfig {
  key: 'name' | 'model' | 'serial_number' | 'manufacturer' | 'location' | 'parts_count';
  direction: 'asc' | 'desc';
}

const MachineList: React.FC = () => {
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'name',
    direction: 'asc'
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get<Machine[]>(`${API_URL}/api/v1/machines`);
      setMachines(response.data);
    } catch (err) {
      console.error('Error fetching machines:', err);
      setError('Failed to fetch machines. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (machineId: number) => {
    try {
      await axios.delete(`${API_URL}/api/v1/machines/${machineId}`);
      setMachines(machines.filter(m => m.machine_id !== machineId));
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting machine:', err);
      setError('Failed to delete machine. Please try again later.');
    }
  };

  const handleSort = (key: 'name' | 'model' | 'serial_number' | 'manufacturer' | 'location' | 'parts_count') => {
    setSortConfig(current => ({
      key,
      direction:
        current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: 'name' | 'model' | 'serial_number' | 'manufacturer' | 'location' | 'parts_count') => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const filteredAndSortedMachines = machines
    .filter(machine => {
      if (!debouncedSearchTerm) return true;
      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        machine.name.toLowerCase().includes(searchLower) ||
        (machine.model?.toLowerCase().includes(searchLower)) ||
        machine.serial_number.toLowerCase().includes(searchLower) ||
        (machine.location?.toLowerCase().includes(searchLower)) ||
        (machine.manufacturer?.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle undefined values
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      // Compare values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Compare numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      // Default comparison for other types
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading machines...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="h4 mb-0">Machines</h2>
            <p className="text-muted mb-0">
              {filteredAndSortedMachines.length} machine(s) found
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate('/machines/new')}
          >
            Add Machine
          </Button>
        </div>

        {error && (
          <Alert variant="danger" className="mb-4" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="mb-4">
          <InputGroup>
            <InputGroup.Text>
              Search
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by name, model, serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </div>

        {filteredAndSortedMachines.length === 0 ? (
          <Alert variant="info">
            {debouncedSearchTerm
              ? 'No machines found matching your search criteria.'
              : 'No machines available. Add your first machine to get started!'}
          </Alert>
        ) : (
          <div className="table-responsive">
            <Table hover className="align-middle">
              <thead className="bg-light">
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                    Machine Name {getSortIcon('name')}
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('manufacturer')}>
                    Manufacturer {getSortIcon('manufacturer')}
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('model')}>
                    Model {getSortIcon('model')}
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('serial_number')}>
                    Serial Number {getSortIcon('serial_number')}
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('location')}>
                    Location {getSortIcon('location')}
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('parts_count')}>
                    Parts {getSortIcon('parts_count')}
                  </th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedMachines.map((machine) => (
                  <tr key={machine.machine_id}>
                    <td>{machine.name}</td>
                    <td>{machine.manufacturer || '-'}</td>
                    <td>{machine.model || '-'}</td>
                    <td>{machine.serial_number}</td>
                    <td>{machine.location || '-'}</td>
                    <td>
                      <Badge 
                        bg={machine.parts_count > 0 ? 'success' : 'secondary'}
                      >
                        {machine.parts_count}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-2 justify-content-end">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => navigate(`/machines/${machine.machine_id}`)}
                          title="View Details"
                        >
                          View
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => navigate(`/machines/${machine.machine_id}/edit`)}
                          title="Edit Machine"
                        >
                          Edit
                        </Button>
                        {showDeleteConfirm === machine.machine_id ? (
                          <>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(machine.machine_id)}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(machine.machine_id)}
                            title="Delete Machine"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default MachineList;
