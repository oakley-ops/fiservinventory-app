import React, { useState, useEffect } from 'react';
import { Card, Table, Spinner, Badge, Button, Form, Row, Col } from 'react-bootstrap';
import axiosInstance from '../utils/axios';
import { API_URL } from '../config';

interface Machine {
  machine_id: number;
  name: string;
  model: string;
  serial_number: string;
}

interface Part {
  part_id: number;
  name: string;
  manufacturer_part_number: string;
  fiserv_part_number: string;
  quantity: number;
}

interface PartsUsage {
  usage_id: number;
  part_name: string;
  machine_name: string;
  quantity: number;
  usage_date: string;
  fiserv_part_number: string;
}

const PartsUsageForm: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [usageHistory, setUsageHistory] = useState<PartsUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    fetchUsageHistory();
  }, [startDate, endDate]);

  const fetchUsageHistory = async () => {
    try {
      let url = '/api/v1/parts-usage';
      const params = new URLSearchParams();
      
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axiosInstance.get<PartsUsage[]>(url);
      setUsageHistory(response.data);
    } catch (error) {
      console.error('Error fetching usage history:', error);
    }
  };

  const handleExport = async () => {
    try {
      let url = '/api/v1/parts-usage/export';
      const params = new URLSearchParams();
      
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axiosInstance.get(url, {
        responseType: 'blob'
      });

      // Create a download link
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', 'parts-usage-report.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setError('Failed to export data to Excel');
    }
  };

  return (
    <div className="py-4">
      <Card>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="h5 mb-0">Parts Usage History</h3>
            <Button
              variant="success"
              onClick={handleExport}
            >
              Export to Excel
            </Button>
          </div>

          <Row className="mb-4">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          <div className="table-responsive">
            <Table hover className="align-middle">
              <thead className="bg-light">
                <tr>
                  <th>Date</th>
                  <th>Part</th>
                  <th>Fiserv Part #</th>
                  <th>Machine</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {usageHistory.map(usage => (
                  <tr key={usage.usage_id}>
                    <td>{new Date(usage.usage_date).toLocaleDateString()}</td>
                    <td>{usage.part_name}</td>
                    <td>{usage.fiserv_part_number}</td>
                    <td>{usage.machine_name}</td>
                    <td>
                      <Badge bg="info">
                        {usage.quantity}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default PartsUsageForm;
