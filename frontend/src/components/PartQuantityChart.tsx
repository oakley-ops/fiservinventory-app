import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface Part {
  name: string;
  quantity: number;
}

const PartQuantityChart: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axiosInstance.get<Part[]>('/api/v1/parts');
        setParts(response.data);
      } catch (err) {
        console.error('Error fetching parts:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch parts data');
      } finally {
        setLoading(false);
      }
    };

    fetchParts();
  }, []);

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Loading chart data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <h4 className="alert-heading">Error loading chart</h4>
        <p className="mb-0">{error}</p>
      </div>
    );
  }

  if (!parts || parts.length === 0) {
    return (
      <div className="alert alert-info" role="alert">
        <h4 className="alert-heading">No Data Available</h4>
        <p className="mb-0">No parts data available at this time.</p>
      </div>
    );
  }

  const chartData = parts.map((part) => ({
    name: part.name || 'Unnamed Part',
    quantity: part.quantity || 0,
  }));

  return (
    <div>
      <h2 className="h4 mb-4">Part Quantities</h2>
      <div style={{ width: '100%', height: '400px' }}>
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name"
              height={60}
              angle={-45}
              textAnchor="end"
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="quantity" fill="#0d6efd" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PartQuantityChart;